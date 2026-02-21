package cc.uconnect.publisher;

import cc.uconnect.model.FriendEvent;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
@Slf4j
@RequiredArgsConstructor
public class FriendEventKafkaPublisher {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    @Value("${app.kafka.topics.friend-events:friend.event}")
    private String friendEventsTopic;

    public void publish(FriendEvent event) {
        if (event == null || event.getEventType() == null) {
            return;
        }

        String recipientUserId = event.getRecipientUserId();
        if (recipientUserId == null || recipientUserId.isBlank()) {
            log.warn("Skip friend event publish: recipientUserId is missing eventType={} eventId={}",
                    event.getEventType(),
                    event.getEventId());
            return;
        }

        String payload;
        try {
            payload = objectMapper.writeValueAsString(event);
        } catch (JsonProcessingException ex) {
            log.error("Failed to serialize friend event eventType={} eventId={}",
                    event.getEventType(),
                    event.getEventId(),
                    ex);
            return;
        }

        kafkaTemplate.send(friendEventsTopic, recipientUserId, payload)
                .whenComplete((result, ex) -> {
                    if (ex != null) {
                        log.error("Failed to publish friend event topic={} eventType={} eventId={} recipientUserId={}",
                                friendEventsTopic,
                                event.getEventType(),
                                event.getEventId(),
                                recipientUserId,
                                ex);
                        return;
                    }
                    if (result == null) {
                        return;
                    }
                    log.debug("Friend event published topic={} eventType={} eventId={} recipientUserId={} partition={} offset={}",
                            friendEventsTopic,
                            event.getEventType(),
                            event.getEventId(),
                            recipientUserId,
                            result.getRecordMetadata().partition(),
                            result.getRecordMetadata().offset());
                });
    }
}
