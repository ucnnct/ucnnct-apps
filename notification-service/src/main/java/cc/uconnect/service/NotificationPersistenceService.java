package cc.uconnect.service;

import cc.uconnect.enums.NotificationDecisionType;
import cc.uconnect.enums.NotificationStatus;
import cc.uconnect.model.Message;
import cc.uconnect.model.Notification;
import cc.uconnect.model.NotificationEntity;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.data.r2dbc.core.R2dbcEntityTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.UUID;

@Service
@Log4j2
@RequiredArgsConstructor
public class NotificationPersistenceService {

    private final R2dbcEntityTemplate entityTemplate;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Mono<Notification> persist(Notification notification,
                                      NotificationDecisionType decisionType,
                                      Message message,
                                      String ownerUserId) {
        if (notification == null) {
            return Mono.error(new IllegalArgumentException("notification is required"));
        }
        if (notification.getTargetId() == null || notification.getTargetId().isBlank()) {
            return Mono.error(new IllegalArgumentException("targetId is required"));
        }
        if (ownerUserId == null || ownerUserId.isBlank()) {
            return Mono.error(new IllegalArgumentException("ownerUserId is required"));
        }

        NotificationEntity entity = toEntity(notification, decisionType, message, ownerUserId);
        return entityTemplate.insert(NotificationEntity.class)
                .using(entity)
                .doOnSuccess(saved -> log.debug(
                        "Notification persisted notificationId={} ownerUserId={} targetId={} messageId={} decision={} status={}",
                        saved.getNotificationId(),
                        saved.getOwnerUserId(),
                        saved.getTargetId(),
                        saved.getMessageId(),
                        saved.getDecisionType(),
                        saved.getStatus()))
                .map(this::toNotification);
    }

    private NotificationEntity toEntity(Notification notification,
                                        NotificationDecisionType decisionType,
                                        Message message,
                                        String ownerUserId) {
        String notificationId = notification.getNotificationId();
        if (notificationId == null || notificationId.isBlank()) {
            notificationId = UUID.randomUUID().toString();
        }

        Instant createdAt = Instant.now();
        return NotificationEntity.builder()
                .notificationId(notificationId)
                .messageId(message == null ? null : message.getMessageId())
                .senderId(message == null ? null : message.getSenderId())
                .ownerUserId(ownerUserId)
                .targetId(notification.getTargetId())
                .category(notification.getCategory())
                .content(notification.getContent())
                .decisionType(decisionType == null ? null : decisionType.name())
                .status(NotificationStatus.UNREAD.name())
                .createdAt(createdAt)
                .readAt(null)
                .build();
    }

    private Notification toNotification(NotificationEntity entity) {
        return Notification.builder()
                .notificationId(entity.getNotificationId())
                .ownerUserId(entity.getOwnerUserId())
                .targetId(entity.getTargetId())
                .category(entity.getCategory())
                .content(entity.getContent())
                .status(entity.getStatus())
                .createdAt(toEpochMillis(entity.getCreatedAt()))
                .readAt(toEpochMillis(entity.getReadAt()))
                .build();
    }

    private Long toEpochMillis(Instant value) {
        return value == null ? null : value.toEpochMilli();
    }
}
