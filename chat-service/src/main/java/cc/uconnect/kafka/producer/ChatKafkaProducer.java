package cc.uconnect.kafka.producer;

import cc.uconnect.kafka.event.MessagePersistedEvent;
import cc.uconnect.kafka.event.MessageReadConfirmedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class ChatKafkaProducer {

    @Value("${app.kafka.topics.messages-persisted:message.persisted}")
    private String messagesPersistedTopic;

    @Value("${app.kafka.topics.message-read-confirmed:message.read.confirmed}")
    private String messageReadConfirmedTopic;

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void publishMessagePersisted(MessagePersistedEvent event) {
        String key = resolveKafkaKey(event);
        log.info("FLOW kafka.publish topic={} key={} messageId={} type={} step=chat.persisted",
                messagesPersistedTopic,
                key,
                event.getMessageId(),
                event.getType());
        kafkaTemplate.send(messagesPersistedTopic, key, event);
    }

    public void publishMessageReadConfirmed(MessageReadConfirmedEvent event) {
        log.info("FLOW kafka.publish topic={} key={} messageId={} step=chat.read-confirmed",
                messageReadConfirmedTopic,
                event.getMessageId(),
                event.getMessageId());
        kafkaTemplate.send(messageReadConfirmedTopic, event.getMessageId(), event);
    }

    private String resolveKafkaKey(MessagePersistedEvent event) {
        if (event.getGroupId() != null && !event.getGroupId().isBlank()) {
            return event.getGroupId();
        }

        List<String> receiversId = event.getReceiversId();
        if (receiversId != null && !receiversId.isEmpty()) {
            String firstReceiver = receiversId.get(0);
            if (firstReceiver != null && !firstReceiver.isBlank()) {
                return firstReceiver;
            }
        }

        if (event.getSenderId() != null && !event.getSenderId().isBlank()) {
            return event.getSenderId();
        }

        if (event.getMessageId() != null && !event.getMessageId().isBlank()) {
            return event.getMessageId();
        }

        throw new IllegalArgumentException("Kafka key cannot be resolved for message.persisted");
    }
}
