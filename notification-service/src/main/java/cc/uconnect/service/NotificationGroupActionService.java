package cc.uconnect.service;

import cc.uconnect.configs.NotificationServiceProperties;
import cc.uconnect.enums.GroupEventType;
import cc.uconnect.enums.NotificationDecisionType;
import cc.uconnect.interfaces.GroupNotificationTemplateHandler;
import cc.uconnect.model.GroupEvent;
import cc.uconnect.model.GroupInfo;
import cc.uconnect.model.Notification;
import cc.uconnect.model.PresenceSnapshot;
import cc.uconnect.model.UserContact;
import cc.uconnect.publisher.NotificationKafkaPublisher;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;
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
    private final List<GroupNotificationTemplateHandler> templateHandlers;

    private final Map<GroupEventType, GroupNotificationTemplateHandler> templateHandlersByType =
            new EnumMap<>(GroupEventType.class);

    @PostConstruct
    public void initTemplateHandlers() {
        for (GroupNotificationTemplateHandler templateHandler : templateHandlers) {
            GroupNotificationTemplateHandler existing =
                    templateHandlersByType.putIfAbsent(templateHandler.eventType(), templateHandler);
            if (existing != null) {
                throw new IllegalStateException("Duplicate group notification template handler for type "
                        + templateHandler.eventType());
            }
        }
        for (GroupEventType eventType : GroupEventType.values()) {
            if (!templateHandlersByType.containsKey(eventType)) {
                throw new IllegalStateException("Missing group notification template handler for type " + eventType);
            }
        }
    }

    public Mono<Void> handleGroupEvent(GroupEvent event) {
        if (!isValidEvent(event)) {
            return Mono.empty();
        }

        GroupNotificationTemplateHandler templateHandler = resolveTemplateHandler(event.getEventType());
        String recipientUserId = event.getRecipientUserId();
        return presenceContextService.getPresenceSnapshot(recipientUserId)
                .flatMap(snapshot -> {
                    NotificationDecisionType decision = decisionService.decideGroupEvent(event, snapshot);
                    return switch (decision) {
                        case SKIP -> skipNotification(event, snapshot);
                        case IN_APP -> sendInAppNotification(event, templateHandler);
                        case EMAIL -> sendEmailNotification(event, templateHandler);
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

    private Mono<Void> sendInAppNotification(GroupEvent event, GroupNotificationTemplateHandler templateHandler) {
        return Mono.zip(resolveActorName(event), resolveGroupName(event))
                .flatMap(tuple -> {
                    String actorName = tuple.getT1();
                    String groupName = tuple.getT2();
                    Notification notification = buildNotification(event, actorName, groupName, templateHandler);
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

    private Mono<Void> sendEmailNotification(GroupEvent event, GroupNotificationTemplateHandler templateHandler) {
        return Mono.zip(resolveActorName(event), resolveGroupName(event))
                .flatMap(tuple -> {
                    String actorName = tuple.getT1();
                    String groupName = tuple.getT2();
                    Notification notification = buildNotification(event, actorName, groupName, templateHandler);
                    String subject = buildEmailSubject(templateHandler.emailSubjectBase());
                    String htmlBody = buildEmailHtmlBody(templateHandler, event, actorName, groupName);
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

    private Notification buildNotification(GroupEvent event,
                                           String actorName,
                                           String groupName,
                                           GroupNotificationTemplateHandler templateHandler) {
        String content = templateHandler.buildInAppContent(event, actorName, groupName);
        String targetId = valueOrDefault(event.getGroupId(), event.getRecipientUserId());

        return Notification.builder()
                .notificationId(UUID.randomUUID().toString())
                .targetId(targetId)
                .category(templateHandler.category().name())
                .content(content)
                .build();
    }

    private GroupNotificationTemplateHandler resolveTemplateHandler(GroupEventType eventType) {
        GroupNotificationTemplateHandler templateHandler = templateHandlersByType.get(eventType);
        if (templateHandler == null) {
            throw new IllegalStateException("No group notification template handler registered for type " + eventType);
        }
        return templateHandler;
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

    private String buildEmailSubject(String subjectBase) {
        String prefix = valueOrEmpty(properties.getEmail().getSubjectPrefix()).trim();
        if (prefix.isBlank()) {
            return subjectBase;
        }
        return prefix + " " + subjectBase;
    }

    private String buildEmailHtmlBody(GroupNotificationTemplateHandler templateHandler,
                                      GroupEvent event,
                                      String actorName,
                                      String groupName) {
        String headline = templateHandler.buildEmailHeadline(event, actorName, groupName);
        String preview = templateHandler.buildInAppContent(event, actorName, groupName);
        return notificationEmailTemplateService.render(
                templateHandler.emailTemplateFile(),
                escapeHtml(headline),
                escapeHtml(preview));
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
}
