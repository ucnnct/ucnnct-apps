package cc.uconnect.service;

import cc.uconnect.configs.NotificationServiceProperties;
import cc.uconnect.enums.NotificationDecisionType;
import cc.uconnect.interfaces.NotificationMessageBuilder;
import cc.uconnect.model.Message;
import cc.uconnect.model.Notification;
import cc.uconnect.model.NotificationMessageContext;
import cc.uconnect.model.PresenceSnapshot;
import cc.uconnect.model.UserContact;
import cc.uconnect.publisher.NotificationKafkaPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;

@Service
@Log4j2
@RequiredArgsConstructor
public class NotificationDispatchService {

    private final RedisPresenceContextService presenceContextService;
    private final NotificationDecisionService decisionService;
    private final NotificationServiceProperties properties;
    private final NotificationKafkaPublisher notificationKafkaPublisher;
    private final NotificationDirectoryService directoryService;
    private final NotificationEmailService notificationEmailService;
    private final NotificationMessageContextResolver contextResolver;
    private final NotificationPersistenceService notificationPersistenceService;

    public Mono<Void> dispatchForPersistedMessage(Message message, NotificationMessageBuilder messageBuilder) {
        if (!isValidPersistedMessage(message)) {
            return Mono.empty();
        }

        List<String> targetUserIds = message.getReceiversId().stream()
                .filter(userId -> userId != null && !userId.isBlank())
                .filter(userId -> !userId.equals(message.getSenderId()))
                .distinct()
                .toList();

        if (targetUserIds.isEmpty()) {
            return Mono.empty();
        }

        return contextResolver.resolve(message)
                .flatMapMany(context -> Flux.fromIterable(targetUserIds)
                        .concatMap(targetUserId -> dispatchToTarget(
                                message,
                                targetUserId,
                                context,
                                messageBuilder)))
                .then();
    }

    private Mono<Void> dispatchToTarget(Message message,
                                        String targetUserId,
                                        NotificationMessageContext context,
                                        NotificationMessageBuilder messageBuilder) {
        return presenceContextService.getPresenceSnapshot(targetUserId)
                .flatMap(snapshot -> {
                    NotificationDecisionType decision = decisionService.decide(message, snapshot);
                    return switch (decision) {
                        case SKIP -> skipNotification(targetUserId, message, snapshot);
                        case IN_APP -> sendInAppNotification(targetUserId, message, context, messageBuilder);
                        case EMAIL -> sendEmailNotification(targetUserId, message, context, messageBuilder);
                    };
                });
    }

    private Mono<Void> skipNotification(String targetUserId, Message message, PresenceSnapshot snapshot) {
        return Mono.fromRunnable(() -> log.debug(
                "Skip notification userId={} messageId={} reason=already-viewing-conversation online={} instanceId={}",
                targetUserId,
                message.getMessageId(),
                snapshot.isOnline(),
                snapshot.getInstanceId()));
    }

    private Mono<Void> sendInAppNotification(String targetUserId,
                                             Message message,
                                             NotificationMessageContext context,
                                             NotificationMessageBuilder messageBuilder) {
        Notification notification = buildNotificationForDispatch(
                targetUserId,
                message,
                context,
                messageBuilder);
        return notificationPersistenceService.persist(notification, NotificationDecisionType.IN_APP, message)
                .flatMap(savedNotification -> notificationKafkaPublisher.publishInAppNotification(targetUserId, savedNotification));
    }

    private Mono<Void> sendEmailNotification(String targetUserId,
                                             Message message,
                                             NotificationMessageContext context,
                                             NotificationMessageBuilder messageBuilder) {
        Notification notification = buildNotificationForDispatch(
                targetUserId,
                message,
                context,
                messageBuilder);
        String subject = messageBuilder.buildEmailSubject(properties.getEmail().getSubjectPrefix());
        String htmlBody = messageBuilder.getEmailHtmlBody(message, context);
        return notificationPersistenceService.persist(notification, NotificationDecisionType.EMAIL, message)
                .then(directoryService.findUserContact(targetUserId)
                        .switchIfEmpty(Mono.defer(() -> {
                            log.warn("Skip email notification because no contact found userId={} messageId={}",
                                    targetUserId,
                                    message.getMessageId());
                            return Mono.<UserContact>empty();
                        }))
                        .flatMap(contact -> notificationEmailService.sendOfflineMessageNotification(
                                contact,
                                subject,
                                htmlBody)));
    }

    private Notification buildNotificationForDispatch(String targetUserId,
                                                      Message message,
                                                      NotificationMessageContext context,
                                                      NotificationMessageBuilder messageBuilder) {
        return messageBuilder.buildInAppNotification(
                targetUserId,
                message,
                context);
    }

    private boolean isValidPersistedMessage(Message message) {
        if (message == null) {
            log.debug("Skip notification dispatch: message is null");
            return false;
        }
        if (message.getMessageId() == null || message.getMessageId().isBlank()) {
            log.debug("Skip notification dispatch: messageId is missing senderId={}", message.getSenderId());
            return false;
        }
        if (message.getSenderId() == null || message.getSenderId().isBlank()) {
            log.debug("Skip notification dispatch: senderId is missing messageId={}", message.getMessageId());
            return false;
        }
        if (message.getReceiversId() == null || message.getReceiversId().isEmpty()) {
            log.debug("Skip notification dispatch: receiversId is missing messageId={}", message.getMessageId());
            return false;
        }
        return true;
    }
}
