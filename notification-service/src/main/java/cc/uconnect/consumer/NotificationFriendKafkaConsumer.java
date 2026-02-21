package cc.uconnect.consumer;

import cc.uconnect.configs.NotificationServiceProperties;
import cc.uconnect.model.FriendEvent;
import cc.uconnect.service.NotificationFriendActionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

@Service
@Log4j2
@RequiredArgsConstructor
public class NotificationFriendKafkaConsumer {

    private final ObjectMapper objectMapper;
    private final NotificationFriendActionService notificationFriendActionService;
    private final NotificationServiceProperties properties;

    @KafkaListener(
            topics = "${app.kafka.topics.friend-events}",
            groupId = "${spring.kafka.consumer.group-id}"
    )
    public void onFriendEvent(String rawPayload) {
        decode(rawPayload)
                .flatMap(event -> notificationFriendActionService.handleFriendEvent(event)
                        .onErrorResume(ex -> {
                            log.error("Friend notification dispatch failed eventId={} eventType={}",
                                    event.getEventId(),
                                    event.getEventType(),
                                    ex);
                            return Mono.empty();
                        }))
                .onErrorResume(ex -> {
                    log.error("Failed to process friend event topic={} payload={}",
                            properties.getKafka().getTopics().getFriendEvents(),
                            rawPayload,
                            ex);
                    return Mono.empty();
                })
                .subscribe();
    }

    private Mono<FriendEvent> decode(String rawPayload) {
        return Mono.fromCallable(() -> objectMapper.readValue(rawPayload, FriendEvent.class))
                .subscribeOn(Schedulers.boundedElastic());
    }
}
