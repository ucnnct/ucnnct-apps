package cc.uconnect.publisher;

import cc.uconnect.model.Post;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class SocialEventPublisher {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    @Value("${app.kafka.topics.social-events:social.event}")
    private String socialEventsTopic;

    @Value("${app.kafka.topics.in-app-notifications:inapp.notification}")
    private String inAppNotificationsTopic;

    public void publishPostEvent(String eventType, Post post, String actorId) {
        publish(socialEventsTopic, post.getId().toString(), Map.of(
                "eventType", eventType,
                "postId", post.getId(),
                "postType", post.getType(),
                "authorId", post.getAuthorId(),
                "actorId", actorId,
                "createdAt", Instant.now().toString()
        ));
    }

    public void publishInAppNotification(String ownerUserId, String targetId, String category, String content) {
        publish(inAppNotificationsTopic, ownerUserId, Map.of(
                "notificationId", UUID.randomUUID().toString(),
                "ownerUserId", ownerUserId,
                "targetId", targetId,
                "category", category,
                "content", content,
                "status", "UNREAD",
                "createdAt", Instant.now().toEpochMilli()
        ));
    }

    private void publish(String topic, String key, Map<String, Object> payload) {
        try {
            kafkaTemplate.send(topic, key, objectMapper.writeValueAsString(payload));
            log.info("FLOW kafka.publish topic={} key={} eventType={} step=social.publish",
                    topic,
                    key,
                    payload.getOrDefault("eventType", payload.get("category")));
        } catch (JsonProcessingException ex) {
            log.warn("Skip social event publish topic={} key={} reason=json-error", topic, key, ex);
        }
    }
}
