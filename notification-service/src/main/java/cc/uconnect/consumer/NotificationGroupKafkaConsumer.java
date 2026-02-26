package cc.uconnect.consumer;

import cc.uconnect.configs.NotificationServiceProperties;
import cc.uconnect.model.GroupEvent;
import cc.uconnect.service.NotificationGroupActionService;
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
public class NotificationGroupKafkaConsumer {

    private final ObjectMapper objectMapper;
    private final NotificationGroupActionService notificationGroupActionService;
    private final NotificationServiceProperties properties;

    @KafkaListener(
            topics = "${app.kafka.topics.group-events}",
            groupId = "${spring.kafka.consumer.group-id}"
    )
    public void onGroupEvent(String rawPayload) {
        decode(rawPayload)
                .doOnNext(event -> log.info("FLOW kafka.consume topic={} eventId={} eventType={} recipientUserId={} groupId={} step=notification.consume-group",
                        properties.getKafka().getTopics().getGroupEvents(),
                        event.getEventId(),
                        event.getEventType(),
                        event.getRecipientUserId(),
                        event.getGroupId()))
                .flatMap(event -> notificationGroupActionService.handleGroupEvent(event)
                        .doOnSuccess(ignored -> log.info("FLOW notification.handled eventId={} eventType={} step=notification.group",
                                event.getEventId(),
                                event.getEventType()))
                        .onErrorResume(ex -> {
                            log.error("Group notification dispatch failed eventId={} eventType={}",
                                    event.getEventId(),
                                    event.getEventType(),
                                    ex);
                            return Mono.empty();
                        }))
                .onErrorResume(ex -> {
                    log.error("Failed to process group event topic={} payload={}",
                            properties.getKafka().getTopics().getGroupEvents(),
                            rawPayload,
                            ex);
                    return Mono.empty();
                })
                .subscribe();
    }

    private Mono<GroupEvent> decode(String rawPayload) {
        return Mono.fromCallable(() -> objectMapper.readValue(rawPayload, GroupEvent.class))
                .subscribeOn(Schedulers.boundedElastic());
    }
}
