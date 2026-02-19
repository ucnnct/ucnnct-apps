package cc.uconnect.publisher;

import cc.uconnect.configs.NotificationServiceProperties;
import cc.uconnect.model.Notification;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

@Service
@Log4j2
@RequiredArgsConstructor
public class NotificationKafkaPublisher {

    private final KafkaJsonPublisher kafkaJsonPublisher;
    private final NotificationServiceProperties properties;

    public Mono<Void> publishInAppNotification(String recipientUserId, Notification notification) {
        String topic = properties.getKafka().getTopics().getInAppNotifications();
        String key = recipientUserId;
        return kafkaJsonPublisher.publish(topic, key, notification)
                .doOnNext(sendResult -> log.debug(
                        "In-app notification published topic={} key={} notificationId={} targetId={} partition={} offset={}",
                        topic,
                        key,
                        notification.getNotificationId(),
                        notification.getTargetId(),
                        sendResult.getRecordMetadata().partition(),
                        sendResult.getRecordMetadata().offset()))
                .then();
    }
}
