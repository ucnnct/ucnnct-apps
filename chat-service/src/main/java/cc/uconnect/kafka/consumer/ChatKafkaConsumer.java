package cc.uconnect.kafka.consumer;

import cc.uconnect.kafka.event.MessagePersistedEvent;
import cc.uconnect.kafka.event.MessageStatusUpdateEvent;
import cc.uconnect.kafka.event.SendMessageEvent;
import cc.uconnect.kafka.producer.ChatKafkaProducer;
import cc.uconnect.model.Message;
import cc.uconnect.model.MessageType;
import cc.uconnect.service.MessageService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class ChatKafkaConsumer {

    private static final String OUTBOUND_TYPE_GROUP = "GROUP";
    private static final String OUTBOUND_TYPE_PRIVATE = "PRIVATE";

    private final ObjectMapper objectMapper;
    private final MessageService messageService;
    private final ChatKafkaProducer producer;

    @KafkaListener(
            topics = "${app.kafka.topics.chat-messages:message.send}",
            groupId = "${spring.kafka.consumer.group-id:chat-service}",
            containerFactory = "kafkaListenerContainerFactory"
    )
    public void onMessageSend(String rawPayload) {
        try {
            SendMessageEvent event = objectMapper.readValue(rawPayload, SendMessageEvent.class);
            log.info("FLOW kafka.consume topic=message.send messageId={} senderId={} type={} groupId={} step=chat.consume-send",
                    event.getMessageId(),
                    event.getSenderId(),
                    event.getType(),
                    event.getGroupId());

            Message saved = messageService.persistFromKafka(event);
            MessagePersistedEvent persistedEvent = toPersistedEvent(saved);
            producer.publishMessagePersisted(persistedEvent);
            log.info("FLOW message.persisted messageId={} conversationId={} type={} step=chat.persisted-db",
                    saved.getId(),
                    saved.getConversationId(),
                    saved.getType());
        } catch (Exception e) {
            log.error("Failed to persist message from Kafka payload={}", rawPayload, e);
        }
    }

    @KafkaListener(
            topics = {
                    "${app.kafka.topics.message-status-updates:message.status.update}",
                    "${app.kafka.topics.message-read-legacy:message.read}"
            },
            groupId = "${spring.kafka.consumer.group-id:chat-service}",
            containerFactory = "kafkaListenerContainerFactory"
    )
    public void onMessageStatusUpdate(String rawPayload) {
        try {
            MessageStatusUpdateEvent event = objectMapper.readValue(rawPayload, MessageStatusUpdateEvent.class);
            log.info("FLOW kafka.consume topic=message.status.update messageId={} status={} senderId={} step=chat.consume-status",
                    event.getMessageId(),
                    event.getStatus(),
                    event.getSenderId());
            messageService.updateStatusFromKafka(event);
        } catch (Exception e) {
            log.error("Failed to process message status update payload={}", rawPayload, e);
        }
    }

    private MessagePersistedEvent toPersistedEvent(Message message) {
        return MessagePersistedEvent.builder()
                .messageId(message.getId())
                .type(resolveOutboundType(message))
                .senderId(message.getSenderId())
                .groupId(message.getGroupId())
                .receiversId(message.getReceiversId())
                .content(message.getContent())
                .objectKey(message.getObjectKey())
                .status(message.getStatus() == null ? null : message.getStatus().name())
                .build();
    }

    private String resolveOutboundType(Message message) {
        if (message.getType() == MessageType.GROUP || (message.getGroupId() != null && !message.getGroupId().isBlank())) {
            return OUTBOUND_TYPE_GROUP;
        }
        return OUTBOUND_TYPE_PRIVATE;
    }
}
