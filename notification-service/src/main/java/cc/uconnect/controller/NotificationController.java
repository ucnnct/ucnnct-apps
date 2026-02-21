package cc.uconnect.controller;

import cc.uconnect.model.NotificationPageResponse;
import cc.uconnect.model.NotificationReadUpdateResponse;
import cc.uconnect.service.NotificationInboxService;
import cc.uconnect.service.NotificationReadService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/notifications/users/{userId}")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationInboxService notificationInboxService;
    private final NotificationReadService notificationReadService;

    @GetMapping
    public Mono<NotificationPageResponse> getNotifications(@PathVariable("userId") String userId,
                                                           @RequestParam(name = "limit", required = false) Integer limit,
                                                           @RequestParam(name = "cursor", required = false) String cursor,
                                                           @AuthenticationPrincipal Jwt jwt) {
        return assertOwner(userId, jwt)
                .then(notificationInboxService.getUserNotifications(userId, limit, cursor));
    }

    @PatchMapping("/{notificationId}/read")
    public Mono<NotificationReadUpdateResponse> markNotificationAsRead(@PathVariable("userId") String userId,
                                                                       @PathVariable("notificationId") String notificationId,
                                                                       @AuthenticationPrincipal Jwt jwt) {
        return assertOwner(userId, jwt)
                .then(notificationReadService.markAsRead(userId, notificationId));
    }

    @PatchMapping("/read-all")
    public Mono<NotificationReadUpdateResponse> markAllNotificationsAsRead(@PathVariable("userId") String userId,
                                                                           @AuthenticationPrincipal Jwt jwt) {
        return assertOwner(userId, jwt)
                .then(notificationReadService.markAllAsRead(userId));
    }

    private Mono<Void> assertOwner(String pathUserId, Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null || jwt.getSubject().isBlank()) {
            return Mono.error(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required"));
        }
        if (!jwt.getSubject().equals(pathUserId)) {
            return Mono.error(new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden"));
        }
        return Mono.empty();
    }
}
