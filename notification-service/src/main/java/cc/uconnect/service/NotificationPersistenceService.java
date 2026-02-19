package cc.uconnect.service;

import cc.uconnect.enums.NotificationDecisionType;
import cc.uconnect.model.Message;
import cc.uconnect.model.Notification;
import cc.uconnect.model.NotificationEntity;
import cc.uconnect.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.UUID;

@Service
@Log4j2
@RequiredArgsConstructor
public class NotificationPersistenceService {

    private final NotificationRepository notificationRepository;

    public Mono<Notification> persist(Notification notification,
                                      NotificationDecisionType decisionType,
                                      Message message) {
        if (notification == null) {
            return Mono.error(new IllegalArgumentException("notification is required"));
        }
        if (notification.getTargetId() == null || notification.getTargetId().isBlank()) {
            return Mono.error(new IllegalArgumentException("targetId is required"));
        }

        NotificationEntity entity = toEntity(notification, decisionType, message);
        return notificationRepository.save(entity)
                .doOnSuccess(saved -> log.debug(
                        "Notification persisted notificationId={} targetId={} messageId={} decision={}",
                        saved.getNotificationId(),
                        saved.getTargetId(),
                        saved.getMessageId(),
                        saved.getDecisionType()))
                .map(this::toNotification);
    }

    private NotificationEntity toEntity(Notification notification,
                                        NotificationDecisionType decisionType,
                                        Message message) {
        String notificationId = notification.getNotificationId();
        if (notificationId == null || notificationId.isBlank()) {
            notificationId = UUID.randomUUID().toString();
        }

        return NotificationEntity.builder()
                .notificationId(notificationId)
                .messageId(message == null ? null : message.getMessageId())
                .senderId(message == null ? null : message.getSenderId())
                .targetId(notification.getTargetId())
                .category(notification.getCategory())
                .content(notification.getContent())
                .decisionType(decisionType == null ? null : decisionType.name())
                .createdAt(Instant.now())
                .build();
    }

    private Notification toNotification(NotificationEntity entity) {
        return Notification.builder()
                .notificationId(entity.getNotificationId())
                .targetId(entity.getTargetId())
                .category(entity.getCategory())
                .content(entity.getContent())
                .build();
    }
}
