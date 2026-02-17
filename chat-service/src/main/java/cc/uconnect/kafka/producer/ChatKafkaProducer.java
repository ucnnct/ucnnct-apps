package cc.uconnect.kafka.producer;

import cc.uconnect.kafka.event.MessagePersistedEvent;
import cc.uconnect.kafka.event.MessageReadConfirmedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class ChatKafkaProducer {

    private static final String TOPIC_MESSAGE_PERSISTED = "message.persisted";
    private static final String TOPIC_MESSAGE_READ_CONFIRMED = "message.read.confirmed";

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void publishMessagePersisted(MessagePersistedEvent event) {
        log.debug("Publishing message.persisted for messageId={}", event.getMessageId());
        kafkaTemplate.send(TOPIC_MESSAGE_PERSISTED, event.getConversationId(), event);
    }

    public void publishMessageReadConfirmed(MessageReadConfirmedEvent event) {
        log.debug("Publishing message.read.confirmed for messageId={}", event.getMessageId());
        kafkaTemplate.send(TOPIC_MESSAGE_READ_CONFIRMED, event.getMessageId(), event);
    }
}
