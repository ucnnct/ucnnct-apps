package cc.uconnect.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserDirectoryCacheService {

    @Value("${app.directory.user-key-prefix:directory:user:}")
    private String userKeyPrefix;

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public void cacheUsersIfAbsent(Collection<String> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return;
        }

        Set<String> normalizedUserIds = new LinkedHashSet<>();
        for (String userId : userIds) {
            if (userId != null && !userId.isBlank()) {
                normalizedUserIds.add(userId);
            }
        }

        for (String userId : normalizedUserIds) {
            cacheUserIfAbsent(userId);
        }
    }

    public void cacheUserIfAbsent(String userId) {
        if (userId == null || userId.isBlank()) {
            return;
        }

        try {
            String key = userKeyPrefix + userId;
            String payload = toUserPayload(userId);
            Boolean inserted = redisTemplate.opsForValue().setIfAbsent(key, payload);
            if (Boolean.TRUE.equals(inserted)) {
                log.debug("Directory user cache created key={} userId={}", key, userId);
            }
        } catch (Exception ex) {
            log.warn("Failed to update directory user cache userId={}", userId, ex);
        }
    }

    private String toUserPayload(String userId) {
        ObjectNode node = objectMapper.createObjectNode();
        node.put("userId", userId);
        node.put("displayName", userId);
        return node.toString();
    }
}

