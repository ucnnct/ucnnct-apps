package cc.uconnect.service;

import cc.uconnect.model.User;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserDirectoryCacheService {

    @Value("${app.directory.user-key-prefix:directory:user:}")
    private String userKeyPrefix;

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public void syncUser(User user) {
        if (user == null || user.getKeycloakId() == null || user.getKeycloakId().isBlank()) {
            return;
        }

        String userId = user.getKeycloakId();
        try {
            String payload = toPayload(user);
            redisTemplate.opsForValue().set(userKeyPrefix + userId, payload);
            log.debug("Directory user cache synced userId={}", userId);
        } catch (Exception ex) {
            log.warn("Failed to sync directory user cache userId={}", userId, ex);
        }
    }

    public void deleteUser(String userId) {
        if (userId == null || userId.isBlank()) {
            return;
        }

        try {
            redisTemplate.delete(userKeyPrefix + userId);
            log.debug("Directory user cache deleted userId={}", userId);
        } catch (Exception ex) {
            log.warn("Failed to delete directory user cache userId={}", userId, ex);
        }
    }

    private String toPayload(User user) {
        ObjectNode node = objectMapper.createObjectNode();
        node.put("userId", valueOrEmpty(user.getKeycloakId()));
        node.put("email", valueOrEmpty(user.getEmail()));
        node.put("displayName", buildDisplayName(user));
        return node.toString();
    }

    private String buildDisplayName(User user) {
        String firstName = valueOrEmpty(user.getFirstName()).trim();
        String lastName = valueOrEmpty(user.getLastName()).trim();
        String fullName = (firstName + " " + lastName).trim();
        if (!fullName.isBlank()) {
            return fullName;
        }

        String username = valueOrEmpty(user.getUsername()).trim();
        if (!username.isBlank()) {
            return username;
        }
        return valueOrEmpty(user.getKeycloakId());
    }

    private String valueOrEmpty(String value) {
        return value == null ? "" : value;
    }
}
