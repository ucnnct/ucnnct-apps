package cc.uconnect.consumer;

import cc.uconnect.configs.NotificationServiceProperties;
import cc.uconnect.model.Message;
import cc.uconnect.service.NotificationDispatchService;
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
public class NotificationMessageKafkaConsumer {

    private final ObjectMapper objectMapper;
    private final NotificationDispatchService notificationDispatchService;
    private final NotificationServiceProperties properties;

    @KafkaListener(
            topics = "${app.kafka.topics.messages-persisted:newmessage}",
            groupId = "${spring.kafka.consumer.group-id:notification-service}"
    )
    public void onPersistedMessage(String rawPayload) {
        decode(rawPayload)
                .flatMap(message -> notificationDispatchService.dispatchForPersistedMessage(message)
                        .onErrorResume(ex -> {
                            log.error("Notification dispatch failed messageId={} senderId={}",
                                    message.getMessageId(),
                                    message.getSenderId(),
                                    ex);
                            return Mono.empty();
                        }))
                .onErrorResume(ex -> {
                    log.error("Failed to process persisted message topic={} payload={}",
                            properties.getKafka().getTopics().getMessagesPersisted(),
                            rawPayload,
                            ex);
                    return Mono.empty();
                })
                .subscribe();
    }

    private Mono<Message> decode(String rawPayload) {
        return Mono.fromCallable(() -> objectMapper.readValue(rawPayload, Message.class))
                .subscribeOn(Schedulers.boundedElastic());
    }
}
