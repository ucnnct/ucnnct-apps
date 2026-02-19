package cc.uconnect.service;

import cc.uconnect.model.Notification;
import cc.uconnect.model.NotificationEntity;
import cc.uconnect.model.NotificationPageResponse;
import cc.uconnect.repository.NotificationReadRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationInboxService {

    private static final int DEFAULT_LIMIT = 20;
    private static final int MAX_LIMIT = 100;

    private final NotificationReadRepository notificationReadRepository;

    public Mono<NotificationPageResponse> getUserNotifications(String ownerUserId, Integer requestedLimit, String cursor) {
        if (ownerUserId == null || ownerUserId.isBlank()) {
            return Mono.error(new IllegalArgumentException("ownerUserId is required"));
        }

        int limit = normalizeLimit(requestedLimit);
        int fetchLimit = limit + 1;

        Flux<NotificationEntity> pageFlux = loadPage(ownerUserId, fetchLimit, cursor);
        return pageFlux.collectList()
                .map(entities -> toPageResponse(entities, limit));
    }

    private Flux<NotificationEntity> loadPage(String ownerUserId, int fetchLimit, String cursor) {
        if (cursor == null || cursor.isBlank()) {
            return notificationReadRepository.findFirstPageByOwnerUserId(ownerUserId, fetchLimit);
        }

        CursorToken cursorToken = decodeCursor(cursor);
        return notificationReadRepository.findNextPageByOwnerUserId(
                ownerUserId,
                cursorToken.createdAt(),
                cursorToken.notificationId(),
                fetchLimit);
    }

    private NotificationPageResponse toPageResponse(List<NotificationEntity> entities, int limit) {
        boolean hasMore = entities.size() > limit;
        List<NotificationEntity> pageEntities = hasMore ? entities.subList(0, limit) : entities;

        List<Notification> notifications = pageEntities.stream()
                .map(this::mapEntityToNotification)
                .toList();

        String nextCursor = null;
        if (hasMore && !pageEntities.isEmpty()) {
            NotificationEntity last = pageEntities.get(pageEntities.size() - 1);
            nextCursor = encodeCursor(last.getCreatedAt(), last.getNotificationId());
        }

        return NotificationPageResponse.builder()
                .notifications(notifications)
                .limit(limit)
                .hasMore(hasMore)
                .nextCursor(nextCursor)
                .build();
    }

    private Notification mapEntityToNotification(NotificationEntity entity) {
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

    private String encodeCursor(Instant createdAt, String notificationId) {
        if (createdAt == null || notificationId == null || notificationId.isBlank()) {
            return null;
        }
        String raw = createdAt.toEpochMilli() + "|" + notificationId;
        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(raw.getBytes(StandardCharsets.UTF_8));
    }

    private CursorToken decodeCursor(String cursor) {
        try {
            byte[] decodedBytes = Base64.getUrlDecoder().decode(cursor);
            String raw = new String(decodedBytes, StandardCharsets.UTF_8);
            String[] parts = raw.split("\\|", 2);
            if (parts.length != 2) {
                throw new IllegalArgumentException("Invalid cursor format");
            }
            long epochMillis = Long.parseLong(parts[0]);
            String notificationId = parts[1];
            if (notificationId.isBlank()) {
                throw new IllegalArgumentException("Invalid cursor notification id");
            }
            return new CursorToken(Instant.ofEpochMilli(epochMillis), notificationId);
        } catch (Exception ex) {
            throw new IllegalArgumentException("Invalid cursor value");
        }
    }

    private int normalizeLimit(Integer requestedLimit) {
        if (requestedLimit == null) {
            return DEFAULT_LIMIT;
        }
        if (requestedLimit < 1) {
            return DEFAULT_LIMIT;
        }
        return Math.min(requestedLimit, MAX_LIMIT);
    }

    private Long toEpochMillis(Instant value) {
        return value == null ? null : value.toEpochMilli();
    }

    private record CursorToken(Instant createdAt, String notificationId) {
    }
}
