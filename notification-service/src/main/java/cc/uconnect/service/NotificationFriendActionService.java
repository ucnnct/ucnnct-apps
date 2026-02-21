package cc.uconnect.service;

import cc.uconnect.configs.NotificationServiceProperties;
import cc.uconnect.enums.FriendEventType;
import cc.uconnect.enums.NotificationCategory;
import cc.uconnect.enums.NotificationDecisionType;
import cc.uconnect.model.FriendEvent;
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
public class NotificationFriendActionService {

    private final NotificationServiceProperties properties;
    private final RedisPresenceContextService presenceContextService;
    private final NotificationDecisionService decisionService;
    private final NotificationPersistenceService notificationPersistenceService;
    private final NotificationKafkaPublisher notificationKafkaPublisher;
    private final NotificationDirectoryService directoryService;
    private final NotificationEmailService notificationEmailService;
    private final NotificationEmailTemplateService notificationEmailTemplateService;

    public Mono<Void> handleFriendEvent(FriendEvent event) {
        if (!isValidEvent(event)) {
            return Mono.empty();
        }

        String recipientUserId = event.getRecipientUserId();
        return presenceContextService.getPresenceSnapshot(recipientUserId)
                .flatMap(snapshot -> {
                    NotificationDecisionType decision =
                            decisionService.decideFriendEvent(event.getEventType(), snapshot);
                    return switch (decision) {
                        case SKIP -> skipNotification(event, snapshot);
                        case IN_APP -> sendInAppNotification(event);
                        case EMAIL -> sendEmailNotification(event);
                    };
                });
    }

    private Mono<Void> skipNotification(FriendEvent event, PresenceSnapshot snapshot) {
        return Mono.fromRunnable(() -> log.debug(
                "Skip friend notification recipientUserId={} eventType={} eventId={} online={} instanceId={} page={}",
                event.getRecipientUserId(),
                event.getEventType(),
                event.getEventId(),
                snapshot != null && snapshot.isOnline(),
                snapshot == null ? null : snapshot.getInstanceId(),
                snapshot == null || snapshot.getActiveContext() == null ? null : snapshot.getActiveContext().getPage()));
    }

    private Mono<Void> sendInAppNotification(FriendEvent event) {
        return resolveActorName(event)
                .flatMap(actorName -> {
                    Notification notification = buildNotification(event, actorName);
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

    private Mono<Void> sendEmailNotification(FriendEvent event) {
        return resolveActorName(event)
                .flatMap(actorName -> {
                    Notification notification = buildNotification(event, actorName);
                    FriendTemplate template = resolveTemplate(event);
                    String subject = buildEmailSubject(template.emailSubjectBase());
                    String htmlBody = buildEmailHtmlBody(
                            template.emailTemplateFile(),
                            template.emailHeadlinePattern(),
                            template.inAppPattern(),
                            actorName);
                    return notificationPersistenceService.persist(
                                    notification,
                                    NotificationDecisionType.EMAIL,
                                    null,
                                    event.getRecipientUserId())
                            .then(directoryService.findUserContact(event.getRecipientUserId())
                                    .switchIfEmpty(Mono.defer(() -> {
                                        log.warn("Skip friend email notification because no contact found recipientUserId={} eventType={} eventId={}",
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

    private Notification buildNotification(FriendEvent event, String actorName) {
        FriendTemplate template = resolveTemplate(event);
        String content = applyActorPattern(template.inAppPattern(), actorName);

        return Notification.builder()
                .notificationId(UUID.randomUUID().toString())
                .targetId(valueOrDefault(event.getActorUserId(), event.getRecipientUserId()))
                .category(template.category().name())
                .content(content)
                .build();
    }

    private Mono<String> resolveActorName(FriendEvent event) {
        String actorNameFromEvent = extractActorNameFromEvent(event);
        if (!actorNameFromEvent.isBlank()) {
            return Mono.just(actorNameFromEvent);
        }

        String actorUserId = event.getActorUserId();
        if (actorUserId == null || actorUserId.isBlank()) {
            return Mono.just(defaultSenderName());
        }

        return directoryService.findUser(actorUserId)
                .map(contact -> normalizeDisplayName(contact.getDisplayName(), actorUserId))
                .filter(name -> name != null && !name.isBlank())
                .defaultIfEmpty(defaultSenderName());
    }

    private String extractActorNameFromEvent(FriendEvent event) {
        if (event == null || event.getActorUserId() == null || event.getActorUserId().isBlank()) {
            return "";
        }
        if (event.getActorUserId().equals(event.getRequesterId())) {
            return valueOrEmpty(event.getRequesterDisplayName());
        }
        if (event.getActorUserId().equals(event.getReceiverId())) {
            return valueOrEmpty(event.getReceiverDisplayName());
        }
        return "";
    }

    private FriendTemplate resolveTemplate(FriendEvent event) {
        FriendEventType eventType = event == null ? null : event.getEventType();
        if (eventType == FriendEventType.FRIEND_REQUEST_ACCEPTED) {
            NotificationServiceProperties.FriendAcceptedProperties props =
                    properties.getNotifications().getFriendAccepted();
            return new FriendTemplate(
                    NotificationCategory.FRIEND_REQUEST_ACCEPTED_IN_APP,
                    valueOrDefault(props.getInAppPattern(), "{actor} a accepte votre demande d'ami."),
                    valueOrDefault(props.getEmailSubjectBase(), "Demande d'ami acceptee"),
                    valueOrDefault(props.getEmailTemplateFile(), "friend_accepted.html"),
                    valueOrDefault(props.getEmailHeadlinePattern(), "{actor} a accepte votre demande d'ami."));
        }

        if (eventType == FriendEventType.FRIEND_REQUEST_REJECTED) {
            NotificationServiceProperties.FriendRejectedProperties props =
                    properties.getNotifications().getFriendRejected();
            return new FriendTemplate(
                    NotificationCategory.FRIEND_REQUEST_REJECTED_IN_APP,
                    valueOrDefault(props.getInAppPattern(), "{actor} a refuse votre demande d'ami."),
                    valueOrDefault(props.getEmailSubjectBase(), "Demande d'ami refusee"),
                    valueOrDefault(props.getEmailTemplateFile(), "friend_rejected.html"),
                    valueOrDefault(props.getEmailHeadlinePattern(), "{actor} a refuse votre demande d'ami."));
        }

        if (eventType == FriendEventType.FRIEND_REMOVED) {
            NotificationServiceProperties.FriendRemovedProperties props =
                    properties.getNotifications().getFriendRemoved();
            return new FriendTemplate(
                    NotificationCategory.FRIEND_REMOVED_IN_APP,
                    valueOrDefault(props.getInAppPattern(), "{actor} vous a retire de ses amis."),
                    valueOrDefault(props.getEmailSubjectBase(), "Amitie terminee"),
                    valueOrDefault(props.getEmailTemplateFile(), "friend_removed.html"),
                    valueOrDefault(props.getEmailHeadlinePattern(), "{actor} vous a retire de ses amis."));
        }

        NotificationServiceProperties.FriendRequestProperties props =
                properties.getNotifications().getFriendRequest();
        return new FriendTemplate(
                NotificationCategory.FRIEND_REQUEST_IN_APP,
                valueOrDefault(props.getInAppPattern(), "{actor} vous a envoye une demande d'ami."),
                valueOrDefault(props.getEmailSubjectBase(), "Nouvelle demande d'ami"),
                valueOrDefault(props.getEmailTemplateFile(), "friend_request.html"),
                valueOrDefault(props.getEmailHeadlinePattern(), "{actor} vous a envoye une demande d'ami."));
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
                                      String actorName) {
        String preview = applyActorPattern(previewPattern, actorName);
        String headline = applyActorPattern(headlinePattern, actorName);
        return notificationEmailTemplateService.render(
                templateFile,
                escapeHtml(headline),
                escapeHtml(preview));
    }

    private String applyActorPattern(String pattern, String actorName) {
        String safePattern = valueOrEmpty(pattern);
        return safePattern.replace("{actor}", valueOrDefault(actorName, defaultSenderName()));
    }

    private boolean isValidEvent(FriendEvent event) {
        if (event == null) {
            log.debug("Skip friend notification: event is null");
            return false;
        }
        if (event.getEventType() == null) {
            log.debug("Skip friend notification: eventType is missing eventId={}", event.getEventId());
            return false;
        }
        if (event.getRecipientUserId() == null || event.getRecipientUserId().isBlank()) {
            log.debug("Skip friend notification: recipientUserId is missing eventId={} eventType={}",
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

    private record FriendTemplate(NotificationCategory category,
                                  String inAppPattern,
                                  String emailSubjectBase,
                                  String emailTemplateFile,
                                  String emailHeadlinePattern) {
    }
}
