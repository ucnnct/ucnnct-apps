package cc.uconnect.consumer;

import cc.uconnect.enums.MessageType;
import cc.uconnect.model.Message;
import cc.uconnect.publisher.WsMessageKafkaPublisher;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

@Service
@Log4j2
@RequiredArgsConstructor
public class WsGroupResolvedKafkaConsumer {

    private final ObjectMapper objectMapper;
    private final WsMessageKafkaPublisher messageKafkaPublisher;

    @KafkaListener(
            topics = "${app.kafka.topics.group-resolved:group.resolved}",
            groupId = "${spring.kafka.consumer.group-id:ws-manager-message-delivery}"
    )
    public void onGroupResolvedMessage(String rawPayload) {
        try {
            Message message = objectMapper.readValue(rawPayload, Message.class);
            if (!isReadyForChatPersist(message)) {
                log.debug("Skipping group-resolved Kafka message groupId={} receiversId={}",
                        message == null ? null : message.getGroupId(),
                        message == null ? null : message.getReceiversId());
                return;
            }

            message.setType(MessageType.GROUP);
            log.info("FLOW kafka.consume topic=group.resolved messageId={} groupId={} receiversCount={} step=ws.consume-group-resolved",
                    message.getMessageId(),
                    message.getGroupId(),
                    message.getReceiversId() == null ? 0 : message.getReceiversId().size());
            messageKafkaPublisher.publishToChat(message)
                    .onErrorResume(ex -> {
                        log.error("Failed to publish group resolved message to chat topic groupId={}",
                                message.getGroupId(),
                                ex);
                        return Mono.empty();
                    })
                    .block();
        } catch (Exception ex) {
            log.error("Failed to parse group resolved Kafka payload={}", rawPayload, ex);
        }
    }

    private boolean isReadyForChatPersist(Message message) {
        if (message == null) {
            return false;
        }
        if (message.getGroupId() == null || message.getGroupId().isBlank()) {
            return false;
        }
        return message.getReceiversId() != null && !message.getReceiversId().isEmpty();
    }
}
