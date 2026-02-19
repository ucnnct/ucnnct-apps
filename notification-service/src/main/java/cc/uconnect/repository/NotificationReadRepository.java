package cc.uconnect.repository;

import cc.uconnect.enums.NotificationStatus;
import cc.uconnect.model.NotificationEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Instant;

@Repository
@RequiredArgsConstructor
public class NotificationReadRepository {

    private final DatabaseClient databaseClient;

    public Flux<NotificationEntity> findFirstPageByOwnerUserId(String ownerUserId, int limit) {
        String sql = """
                SELECT notification_id,
                       message_id,
                       sender_id,
                       owner_user_id,
                       target_id,
                       category,
                       content,
                       decision_type,
                       status,
                       created_at,
                       read_at
                FROM notifications
                WHERE owner_user_id = :ownerUserId
                ORDER BY created_at DESC, notification_id DESC
                LIMIT :limit
                """;

        return databaseClient.sql(sql)
                .bind("ownerUserId", ownerUserId)
                .bind("limit", limit)
                .map((row, metadata) -> NotificationEntity.builder()
                        .notificationId(row.get("notification_id", String.class))
                        .messageId(row.get("message_id", String.class))
                        .senderId(row.get("sender_id", String.class))
                        .ownerUserId(row.get("owner_user_id", String.class))
                        .targetId(row.get("target_id", String.class))
                        .category(row.get("category", String.class))
                        .content(row.get("content", String.class))
                        .decisionType(row.get("decision_type", String.class))
                        .status(row.get("status", String.class))
                        .createdAt(row.get("created_at", Instant.class))
                        .readAt(row.get("read_at", Instant.class))
                        .build())
                .all();
    }

    public Flux<NotificationEntity> findNextPageByOwnerUserId(String ownerUserId,
                                                               Instant beforeCreatedAt,
                                                               String beforeNotificationId,
                                                               int limit) {
        String sql = """
                SELECT notification_id,
                       message_id,
                       sender_id,
                       owner_user_id,
                       target_id,
                       category,
                       content,
                       decision_type,
                       status,
                       created_at,
                       read_at
                FROM notifications
                WHERE owner_user_id = :ownerUserId
                  AND (
                        created_at < :beforeCreatedAt
                        OR (created_at = :beforeCreatedAt AND notification_id < :beforeNotificationId)
                  )
                ORDER BY created_at DESC, notification_id DESC
                LIMIT :limit
                """;

        return databaseClient.sql(sql)
                .bind("ownerUserId", ownerUserId)
                .bind("beforeCreatedAt", beforeCreatedAt)
                .bind("beforeNotificationId", beforeNotificationId)
                .bind("limit", limit)
                .map((row, metadata) -> NotificationEntity.builder()
                        .notificationId(row.get("notification_id", String.class))
                        .messageId(row.get("message_id", String.class))
                        .senderId(row.get("sender_id", String.class))
                        .ownerUserId(row.get("owner_user_id", String.class))
                        .targetId(row.get("target_id", String.class))
                        .category(row.get("category", String.class))
                        .content(row.get("content", String.class))
                        .decisionType(row.get("decision_type", String.class))
                        .status(row.get("status", String.class))
                        .createdAt(row.get("created_at", Instant.class))
                        .readAt(row.get("read_at", Instant.class))
                        .build())
                .all();
    }

    public Mono<Integer> markAsRead(String ownerUserId, String notificationId) {
        String sql = """
                UPDATE notifications
                SET status = :status,
                    read_at = NOW()
                WHERE owner_user_id = :ownerUserId
                  AND notification_id = :notificationId
                  AND status <> :status
                """;

        return databaseClient.sql(sql)
                .bind("status", NotificationStatus.READ.name())
                .bind("ownerUserId", ownerUserId)
                .bind("notificationId", notificationId)
                .fetch()
                .rowsUpdated()
                .map(Long::intValue);
    }

    public Mono<Integer> markAllAsRead(String ownerUserId) {
        String sql = """
                UPDATE notifications
                SET status = :status,
                    read_at = NOW()
                WHERE owner_user_id = :ownerUserId
                  AND status <> :status
                """;

        return databaseClient.sql(sql)
                .bind("status", NotificationStatus.READ.name())
                .bind("ownerUserId", ownerUserId)
                .fetch()
                .rowsUpdated()
                .map(Long::intValue);
    }
}
