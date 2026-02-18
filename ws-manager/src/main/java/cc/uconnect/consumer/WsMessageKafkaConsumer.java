package cc.uconnect.consumer;

import cc.uconnect.model.Message;
import cc.uconnect.service.WsMessageDeliveryService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

@Service
@Log4j2
@RequiredArgsConstructor
public class WsMessageKafkaConsumer {

    private final ObjectMapper objectMapper;
    private final WsMessageDeliveryService messageDeliveryService;

    @KafkaListener(
            topics = "${app.kafka.topics.messages:newmessage}",
            groupId = "${spring.kafka.consumer.group-id:ws-manager-message-delivery}"
    )
    public void onPersistedMessage(String rawPayload) {
        try {
            Message message = objectMapper.readValue(rawPayload, Message.class);
            if (!isReadyForDelivery(message)) {
                log.debug("Skipping Kafka message not ready for delivery type={} messageId={} groupId={}",
                        message.getType(),
                        message.getMessageId(),
                        message.getGroupId());
                return;
            }
            messageDeliveryService.deliverMessage(message)
                    .onErrorResume(ex -> {
                        log.error("Failed to deliver persisted message receiversId={}", message.getReceiversId(), ex);
                        return Mono.empty();
                    })
                    .block();
        } catch (Exception ex) {
            log.error("Failed to parse Kafka message payload={}", rawPayload, ex);
        }
    }

    private boolean isReadyForDelivery(Message message) {
        if (message == null) {
            return false;
        }
        if (message.getMessageId() == null || message.getMessageId().isBlank()) {
            return false;
        }
        if (message.getType() == null) {
            return false;
        }
        return message.getReceiversId() != null && !message.getReceiversId().isEmpty();
    }
}
