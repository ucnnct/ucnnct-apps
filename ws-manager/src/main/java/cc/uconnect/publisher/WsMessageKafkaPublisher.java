package cc.uconnect.publisher;

import cc.uconnect.enums.MessageType;
import cc.uconnect.model.Message;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.util.List;

@Service
@Log4j2
@RequiredArgsConstructor
public class WsMessageKafkaPublisher {

    private final WsKafkaPublisher kafkaPublisher;

    @Value("${app.kafka.topics.group-resolve:group.message}")
    private String groupResolveTopic;

    @Value("${app.kafka.topics.chat-messages:message.send}")
    private String chatMessagesTopic;

    @Value("${app.kafka.topics.message-status-updates:message.status.update}")
    private String messageStatusUpdatesTopic;

    public Mono<Void> publishToGroupResolve(Message message) {
        String key = resolveKafkaKey(message);
        return kafkaPublisher.publish(groupResolveTopic, key, message)
                .doOnNext(sendResult -> log.debug(
                        "Message published to Kafka topic={} key={} type={} partition={} offset={}",
                        groupResolveTopic,
                        key,
                        message.getType(),
                        sendResult.getRecordMetadata().partition(),
                        sendResult.getRecordMetadata().offset()))
                .then();
    }

    public Mono<Void> publishToChat(Message message) {
        String key = resolveKafkaKey(message);
        return kafkaPublisher.publish(chatMessagesTopic, key, message)
                .doOnNext(sendResult -> log.debug(
                        "Message published to Kafka topic={} key={} type={} partition={} offset={}",
                        chatMessagesTopic,
                        key,
                        message.getType(),
                        sendResult.getRecordMetadata().partition(),
                        sendResult.getRecordMetadata().offset()))
                .then();
    }

    public Mono<Void> publishStatusUpdate(Message message) {
        String key = resolveStatusKey(message);
        return kafkaPublisher.publish(messageStatusUpdatesTopic, key, message)
                .doOnNext(sendResult -> log.debug(
                        "Message status update published topic={} key={} status={} partition={} offset={}",
                        messageStatusUpdatesTopic,
                        key,
                        message.getStatus(),
                        sendResult.getRecordMetadata().partition(),
                        sendResult.getRecordMetadata().offset()))
                .then();
    }

    private String resolveKafkaKey(Message message) {
        if (message != null && message.getType() == MessageType.GROUP
                && message.getGroupId() != null
                && !message.getGroupId().isBlank()) {
            return message.getGroupId();
        }

        List<String> receiversId = message.getReceiversId();
        if (receiversId != null && !receiversId.isEmpty()) {
            String firstReceiver = receiversId.get(0);
            if (firstReceiver != null && !firstReceiver.isBlank()) {
                return firstReceiver;
            }
        }

        if (message.getGroupId() != null && !message.getGroupId().isBlank()) {
            return message.getGroupId();
        }

        if (message.getSenderId() != null && !message.getSenderId().isBlank()) {
            return message.getSenderId();
        }

        throw new IllegalArgumentException("Kafka key cannot be resolved from message");
    }

    private String resolveStatusKey(Message message) {
        if (message != null && message.getMessageId() != null && !message.getMessageId().isBlank()) {
            return message.getMessageId();
        }
        return resolveKafkaKey(message);
    }
}
