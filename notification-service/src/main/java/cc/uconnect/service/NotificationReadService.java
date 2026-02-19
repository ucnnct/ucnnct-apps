package cc.uconnect.service;

import cc.uconnect.model.NotificationReadUpdateResponse;
import cc.uconnect.repository.NotificationReadRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

@Service
@RequiredArgsConstructor
public class NotificationReadService {

    private final NotificationReadRepository notificationReadRepository;

    public Mono<NotificationReadUpdateResponse> markAsRead(String ownerUserId, String notificationId) {
        if (ownerUserId == null || ownerUserId.isBlank()) {
            return Mono.error(new IllegalArgumentException("ownerUserId is required"));
        }
        if (notificationId == null || notificationId.isBlank()) {
            return Mono.error(new IllegalArgumentException("notificationId is required"));
        }

        return notificationReadRepository.markAsRead(ownerUserId, notificationId)
                .map(updatedCount -> NotificationReadUpdateResponse.builder()
                        .updatedCount(updatedCount)
                        .build());
    }

    public Mono<NotificationReadUpdateResponse> markAllAsRead(String ownerUserId) {
        if (ownerUserId == null || ownerUserId.isBlank()) {
            return Mono.error(new IllegalArgumentException("ownerUserId is required"));
        }

        return notificationReadRepository.markAllAsRead(ownerUserId)
                .map(updatedCount -> NotificationReadUpdateResponse.builder()
                        .updatedCount(updatedCount)
                        .build());
    }
}
