package cc.uconnect.service;

import cc.uconnect.configs.NotificationServiceProperties;
import cc.uconnect.enums.GroupEventType;
import cc.uconnect.enums.NotificationCategory;
import cc.uconnect.enums.NotificationDecisionType;
import cc.uconnect.model.GroupEvent;
import cc.uconnect.model.GroupInfo;
import cc.uconnect.model.Notification;
import cc.uconnect.model.PresenceSnapshot;
import cc.uconnect.model.UserContact;
import cc.uconnect.publisher.NotificationKafkaPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Service
@Log4j2
@RequiredArgsConstructor
public class NotificationGroupActionService {

    private final NotificationServiceProperties properties;
    private final RedisPresenceContextService presenceContextService;
    private final NotificationDecisionService decisionService;
    private final NotificationPersistenceService notificationPersistenceService;
    private final NotificationKafkaPublisher notificationKafkaPublisher;
    private final NotificationDirectoryService directoryService;
    private final NotificationEmailService notificationEmailService;
    private final NotificationEmailTemplateService notificationEmailTemplateService;

    public Mono<Void> handleGroupEvent(GroupEvent event) {
        if (!isValidEvent(event)) {
            return Mono.empty();
        }

        String recipientUserId = event.getRecipientUserId();
        return presenceContextService.getPresenceSnapshot(recipientUserId)
                .flatMap(snapshot -> {
                    NotificationDecisionType decision = decisionService.decideGroupEvent(event, snapshot);
                    return switch (decision) {
                        case SKIP -> skipNotification(event, snapshot);
                        case IN_APP -> sendInAppNotification(event);
                        case EMAIL -> sendEmailNotification(event);
                    };
                });
    }

    private Mono<Void> skipNotification(GroupEvent event, PresenceSnapshot snapshot) {
        return Mono.fromRunnable(() -> log.debug(
                "Skip group notification recipientUserId={} eventType={} eventId={} online={} instanceId={} page={} conversationId={}",
                event.getRecipientUserId(),
                event.getEventType(),
                event.getEventId(),
                snapshot != null && snapshot.isOnline(),
                snapshot == null ? null : snapshot.getInstanceId(),
                snapshot == null || snapshot.getActiveContext() == null ? null : snapshot.getActiveContext().getPage(),
                snapshot == null || snapshot.getActiveContext() == null ? null : snapshot.getActiveContext().getConversationId()));
    }

    private Mono<Void> sendInAppNotification(GroupEvent event) {
        return Mono.zip(resolveActorName(event), resolveGroupName(event))
                .flatMap(tuple -> {
                    String actorName = tuple.getT1();
                    String groupName = tuple.getT2();
                    Notification notification = buildNotification(event, actorName, groupName);
                    return notificationPersistenceService.persist(
                                    notification,
                                    NotificationDecisionType.IN_APP,
                                    null,
                                    event.getRecipientUserId())
                            .flatMap(saved -> notificationKafkaPublisher.publishInAppNotification(
                                    event.getRecipientUserId(),
                                    saved));
                });
    }

    private Mono<Void> sendEmailNotification(GroupEvent event) {
        return Mono.zip(resolveActorName(event), resolveGroupName(event))
                .flatMap(tuple -> {
                    String actorName = tuple.getT1();
                    String groupName = tuple.getT2();
                    GroupTemplate template = resolveTemplate(event);
                    Notification notification = buildNotification(event, actorName, groupName);
                    String subject = buildEmailSubject(template.emailSubjectBase());
                    String htmlBody = buildEmailHtmlBody(
                            template.emailTemplateFile(),
                            template.emailHeadlinePattern(),
                            template.inAppPattern(),
                            actorName,
                            groupName);
                    return notificationPersistenceService.persist(
                                    notification,
                                    NotificationDecisionType.EMAIL,
                                    null,
                                    event.getRecipientUserId())
                            .then(directoryService.findUserContact(event.getRecipientUserId())
                                    .switchIfEmpty(Mono.defer(() -> {
                                        log.warn("Skip group email notification because no contact found recipientUserId={} eventType={} eventId={}",
                                                event.getRecipientUserId(),
                                                event.getEventType(),
                                                event.getEventId());
                                        return Mono.<UserContact>empty();
                                    }))
                                    .flatMap(contact -> notificationEmailService.sendOfflineMessageNotification(
                                            contact,
                                            subject,
                                            htmlBody)));
                });
    }

    private Notification buildNotification(GroupEvent event, String actorName, String groupName) {
        GroupTemplate template = resolveTemplate(event);
        String content = applyPattern(template.inAppPattern(), actorName, groupName);
        String targetId = valueOrDefault(event.getGroupId(), event.getRecipientUserId());

        return Notification.builder()
                .notificationId(UUID.randomUUID().toString())
                .targetId(targetId)
                .category(template.category().name())
                .content(content)
                .build();
    }

    private Mono<String> resolveActorName(GroupEvent event) {
        String actorUserId = event == null ? null : event.getActorUserId();
        if (actorUserId == null || actorUserId.isBlank()) {
            return Mono.just(defaultSenderName());
        }

        return directoryService.findUser(actorUserId)
                .map(contact -> normalizeDisplayName(contact.getDisplayName(), actorUserId))
                .filter(displayName -> displayName != null && !displayName.isBlank())
                .defaultIfEmpty(defaultSenderName());
    }

    private Mono<String> resolveGroupName(GroupEvent event) {
        if (event != null && event.getGroupName() != null && !event.getGroupName().isBlank()) {
            return Mono.just(event.getGroupName());
        }
        String groupId = event == null ? null : event.getGroupId();
        if (groupId == null || groupId.isBlank()) {
            return Mono.just(defaultGroupName());
        }

        return directoryService.findGroup(groupId)
                .map(GroupInfo::getName)
                .filter(name -> name != null && !name.isBlank())
                .defaultIfEmpty(defaultGroupName());
    }

    private GroupTemplate resolveTemplate(GroupEvent event) {
        GroupEventType eventType = event == null ? null : event.getEventType();
        if (eventType == GroupEventType.GROUP_DELETED) {
            NotificationServiceProperties.GroupDeletedProperties props =
                    properties.getNotifications().getGroupDeleted();
            return new GroupTemplate(
                    NotificationCategory.GROUP_DELETED_IN_APP,
                    valueOrDefault(props.getInAppPattern(), "{actor} a supprime le groupe {group}."),
                    valueOrDefault(props.getEmailSubjectBase(), "Suppression de groupe"),
                    valueOrDefault(props.getEmailTemplateFile(), "group_deleted.html"),
                    valueOrDefault(props.getEmailHeadlinePattern(), "{actor} a supprime le groupe {group}."));
        }

        NotificationServiceProperties.GroupMemberAddedProperties props =
                properties.getNotifications().getGroupMemberAdded();
        return new GroupTemplate(
                NotificationCategory.GROUP_MEMBER_ADDED_IN_APP,
                valueOrDefault(props.getInAppPattern(), "{actor} vous a ajoute au groupe {group}."),
                valueOrDefault(props.getEmailSubjectBase(), "Ajout dans un groupe"),
                valueOrDefault(props.getEmailTemplateFile(), "group_member_added.html"),
                valueOrDefault(props.getEmailHeadlinePattern(), "{actor} vous a ajoute au groupe {group}."));
    }

    private String buildEmailSubject(String subjectBase) {
        String prefix = valueOrEmpty(properties.getEmail().getSubjectPrefix()).trim();
        if (prefix.isBlank()) {
            return subjectBase;
        }
        return prefix + " " + subjectBase;
    }

    private String buildEmailHtmlBody(String templateFile,
                                      String headlinePattern,
                                      String previewPattern,
                                      String actorName,
                                      String groupName) {
        String headline = applyPattern(headlinePattern, actorName, groupName);
        String preview = applyPattern(previewPattern, actorName, groupName);
        return notificationEmailTemplateService.render(
                templateFile,
                escapeHtml(headline),
                escapeHtml(preview));
    }

    private String applyPattern(String pattern, String actorName, String groupName) {
        return valueOrEmpty(pattern)
                .replace("{actor}", valueOrDefault(actorName, defaultSenderName()))
                .replace("{group}", valueOrDefault(groupName, defaultGroupName()));
    }

    private boolean isValidEvent(GroupEvent event) {
        if (event == null) {
            log.debug("Skip group notification: event is null");
            return false;
        }
        if (event.getEventType() == null) {
            log.debug("Skip group notification: eventType is missing eventId={}", event.getEventId());
            return false;
        }
        if (event.getRecipientUserId() == null || event.getRecipientUserId().isBlank()) {
            log.debug("Skip group notification: recipientUserId is missing eventId={} eventType={}",
                    event.getEventId(),
                    event.getEventType());
            return false;
        }
        if (event.getGroupId() == null || event.getGroupId().isBlank()) {
            log.debug("Skip group notification: groupId is missing eventId={} eventType={}",
                    event.getEventId(),
                    event.getEventType());
            return false;
        }
        return true;
    }

    private String escapeHtml(String value) {
        return valueOrEmpty(value)
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    private String valueOrDefault(String value, String defaultValue) {
        return (value == null || value.isBlank()) ? valueOrEmpty(defaultValue) : value;
    }

    private String valueOrEmpty(String value) {
        return value == null ? "" : value;
    }

    private String defaultSenderName() {
        return valueOrDefault(properties.getNotifications().getDefaults().getSenderName(), "Quelqu'un");
    }

    private String defaultGroupName() {
        return valueOrDefault(properties.getNotifications().getDefaults().getGroupName(), "Groupe");
    }

    private String normalizeDisplayName(String displayName, String userId) {
        if (displayName == null) {
            return "";
        }

        String normalized = displayName.trim();
        if (normalized.isBlank()) {
            return "";
        }
        if (userId != null && !userId.isBlank() && normalized.equals(userId)) {
            return "";
        }
        return normalized;
    }

    private record GroupTemplate(NotificationCategory category,
                                 String inAppPattern,
                                 String emailSubjectBase,
                                 String emailTemplateFile,
                                 String emailHeadlinePattern) {
    }
}
