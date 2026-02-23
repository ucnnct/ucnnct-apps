package cc.uconnect.service;

import cc.uconnect.configs.NotificationServiceProperties;
import cc.uconnect.enums.FriendEventType;
import cc.uconnect.enums.NotificationDecisionType;
import cc.uconnect.interfaces.FriendNotificationTemplateHandler;
import cc.uconnect.model.FriendEvent;
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
public class NotificationFriendActionService {

    private final NotificationServiceProperties properties;
    private final RedisPresenceContextService presenceContextService;
    private final NotificationDecisionService decisionService;
    private final NotificationPersistenceService notificationPersistenceService;
    private final NotificationKafkaPublisher notificationKafkaPublisher;
    private final NotificationDirectoryService directoryService;
    private final NotificationEmailService notificationEmailService;
    private final NotificationEmailTemplateService notificationEmailTemplateService;
    private final List<FriendNotificationTemplateHandler> templateHandlers;

    private final Map<FriendEventType, FriendNotificationTemplateHandler> templateHandlersByType =
            new EnumMap<>(FriendEventType.class);

    @PostConstruct
    public void initTemplateHandlers() {
        for (FriendNotificationTemplateHandler templateHandler : templateHandlers) {
            FriendNotificationTemplateHandler existing =
                    templateHandlersByType.putIfAbsent(templateHandler.eventType(), templateHandler);
            if (existing != null) {
                throw new IllegalStateException("Duplicate friend notification template handler for type "
                        + templateHandler.eventType());
            }
        }
        for (FriendEventType eventType : FriendEventType.values()) {
            if (!templateHandlersByType.containsKey(eventType)) {
                throw new IllegalStateException("Missing friend notification template handler for type " + eventType);
            }
        }
    }

    public Mono<Void> handleFriendEvent(FriendEvent event) {
        if (!isValidEvent(event)) {
            return Mono.empty();
        }

        FriendNotificationTemplateHandler templateHandler = resolveTemplateHandler(event.getEventType());
        String recipientUserId = event.getRecipientUserId();
        return presenceContextService.getPresenceSnapshot(recipientUserId)
                .flatMap(snapshot -> {
                    NotificationDecisionType decision =
                            decisionService.decideFriendEvent(event.getEventType(), snapshot);
                    return switch (decision) {
                        case SKIP -> skipNotification(event, snapshot);
                        case IN_APP -> sendInAppNotification(event, templateHandler);
                        case EMAIL -> sendEmailNotification(event, templateHandler);
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

    private Mono<Void> sendInAppNotification(FriendEvent event, FriendNotificationTemplateHandler templateHandler) {
        return resolveActorName(event)
                .flatMap(actorName -> {
                    Notification notification = buildNotification(event, actorName, templateHandler);
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

    private Mono<Void> sendEmailNotification(FriendEvent event, FriendNotificationTemplateHandler templateHandler) {
        return resolveActorName(event)
                .flatMap(actorName -> {
                    Notification notification = buildNotification(event, actorName, templateHandler);
                    String subject = buildEmailSubject(templateHandler.emailSubjectBase());
                    String htmlBody = buildEmailHtmlBody(templateHandler, event, actorName);
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

    private Notification buildNotification(FriendEvent event,
                                           String actorName,
                                           FriendNotificationTemplateHandler templateHandler) {
        String content = templateHandler.buildInAppContent(event, actorName);

        return Notification.builder()
                .notificationId(UUID.randomUUID().toString())
                .targetId(valueOrDefault(event.getActorUserId(), event.getRecipientUserId()))
                .category(templateHandler.category().name())
                .content(content)
                .build();
    }

    private FriendNotificationTemplateHandler resolveTemplateHandler(FriendEventType eventType) {
        FriendNotificationTemplateHandler templateHandler = templateHandlersByType.get(eventType);
        if (templateHandler == null) {
            throw new IllegalStateException("No friend notification template handler registered for type " + eventType);
        }
        return templateHandler;
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

    private String buildEmailSubject(String subjectBase) {
        String prefix = valueOrEmpty(properties.getEmail().getSubjectPrefix()).trim();
        if (prefix.isBlank()) {
            return subjectBase;
        }
        return prefix + " " + subjectBase;
    }

    private String buildEmailHtmlBody(FriendNotificationTemplateHandler templateHandler,
                                      FriendEvent event,
                                      String actorName) {
        String preview = templateHandler.buildInAppContent(event, actorName);
        String headline = templateHandler.buildEmailHeadline(event, actorName);
        return notificationEmailTemplateService.render(
                templateHandler.emailTemplateFile(),
                escapeHtml(headline),
                escapeHtml(preview));
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
}
