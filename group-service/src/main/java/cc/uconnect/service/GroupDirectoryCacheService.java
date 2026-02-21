package cc.uconnect.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class GroupDirectoryCacheService {

    @Value("${app.directory.group-key-prefix:directory:group:}")
    private String groupKeyPrefix;

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public void cacheGroup(UUID groupId, String groupName) {
        if (groupId == null) {
            return;
        }
        cacheGroup(groupId.toString(), groupName);
    }

    public void cacheGroup(String groupId, String groupName) {
        if (groupId == null || groupId.isBlank() || groupName == null || groupName.isBlank()) {
            return;
        }

        try {
            String key = groupKeyPrefix + groupId;
            String payload = toGroupPayload(groupId, groupName);
            redisTemplate.opsForValue().set(key, payload);
            log.debug("Directory group cache upsert key={} groupId={} name='{}'", key, groupId, groupName);
        } catch (Exception ex) {
            log.warn("Failed to update directory group cache groupId={}", groupId, ex);
        }
    }

    public void evictGroup(UUID groupId) {
        if (groupId == null) {
            return;
        }
        try {
            String key = groupKeyPrefix + groupId;
            redisTemplate.delete(key);
            log.debug("Directory group cache evicted key={}", key);
        } catch (Exception ex) {
            log.warn("Failed to evict directory group cache groupId={}", groupId, ex);
        }
    }

    private String toGroupPayload(String groupId, String groupName) {
        ObjectNode node = objectMapper.createObjectNode();
        node.put("groupId", groupId);
        node.put("name", groupName);
        return node.toString();
    }
}

