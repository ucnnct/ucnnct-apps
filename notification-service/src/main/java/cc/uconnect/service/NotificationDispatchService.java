package cc.uconnect.service;

import cc.uconnect.client.UserServiceClient;
import cc.uconnect.enums.NotificationDecisionType;
import cc.uconnect.model.Message;
import cc.uconnect.model.Notification;
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
    private final NotificationContentService contentService;
    private final NotificationKafkaPublisher notificationKafkaPublisher;
    private final UserServiceClient userServiceClient;
    private final NotificationEmailService notificationEmailService;

    public Mono<Void> dispatchForPersistedMessage(Message message) {
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

        return Flux.fromIterable(targetUserIds)
                .concatMap(targetUserId -> dispatchToTarget(message, targetUserId))
                .then();
    }

    private Mono<Void> dispatchToTarget(Message message, String targetUserId) {
        return presenceContextService.getPresenceSnapshot(targetUserId)
                .flatMap(snapshot -> {
                    NotificationDecisionType decision = decisionService.decide(message, snapshot);
                    String conversationReference = decisionService.resolveConversationReference(message);
                    return switch (decision) {
                        case SKIP -> skipNotification(targetUserId, message, snapshot);
                        case IN_APP -> sendInAppNotification(targetUserId, message, conversationReference);
                        case EMAIL -> sendEmailNotification(targetUserId, message, conversationReference);
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

    private Mono<Void> sendInAppNotification(String targetUserId, Message message, String conversationReference) {
        Notification notification = contentService.buildInAppNotification(targetUserId, message, conversationReference);
        return notificationKafkaPublisher.publishInAppNotification(notification);
    }

    private Mono<Void> sendEmailNotification(String targetUserId, Message message, String conversationReference) {
        return userServiceClient.findContact(targetUserId)
                .switchIfEmpty(Mono.defer(() -> {
                    log.warn("Skip email notification because no contact found userId={} messageId={}",
                            targetUserId,
                            message.getMessageId());
                    return Mono.<UserContact>empty();
                }))
                .flatMap(contact -> notificationEmailService.sendOfflineMessageNotification(
                        contact,
                        message,
                        conversationReference));
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
