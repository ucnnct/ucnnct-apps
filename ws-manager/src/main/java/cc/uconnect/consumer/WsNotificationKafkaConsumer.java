package cc.uconnect.consumer;

import cc.uconnect.enums.WsOutboundActionType;
import cc.uconnect.model.Notification;
import cc.uconnect.service.WsUserPacketRoutingService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

@Service
@Log4j2
@RequiredArgsConstructor
public class WsNotificationKafkaConsumer {

    private final ObjectMapper objectMapper;
    private final WsUserPacketRoutingService userPacketRoutingService;

    @KafkaListener(
            topics = "${app.kafka.topics.in-app-notifications:inapp.notification}",
            groupId = "${spring.kafka.consumer.group-id:ws-manager-message-delivery}"
    )
    public void onInAppNotification(String rawPayload) {
        try {
            Notification notification = objectMapper.readValue(rawPayload, Notification.class);
            if (!isReadyForDelivery(notification)) {
                log.debug("Skipping in-app notification not ready notificationId={} ownerUserId={} targetId={}",
                        notification == null ? null : notification.getNotificationId(),
                        notification == null ? null : notification.getOwnerUserId(),
                        notification == null ? null : notification.getTargetId());
                return;
            }
            log.info("FLOW kafka.consume topic=inapp.notification notificationId={} ownerUserId={} step=ws.consume-notification",
                    notification.getNotificationId(),
                    notification.getOwnerUserId());

            userPacketRoutingService.routeToUser(notification.getOwnerUserId(), WsOutboundActionType.NOTIFICATION, notification)
                    .onErrorResume(ex -> {
                        log.error("Failed to deliver in-app notification notificationId={} ownerUserId={}",
                                notification.getNotificationId(),
                                notification.getOwnerUserId(),
                                ex);
                        return Mono.empty();
                    })
                    .block();
        } catch (Exception ex) {
            log.error("Failed to parse in-app notification payload={}", rawPayload, ex);
        }
    }

    private boolean isReadyForDelivery(Notification notification) {
        if (notification == null) {
            return false;
        }
        return notification.getOwnerUserId() != null && !notification.getOwnerUserId().isBlank();
    }
}
