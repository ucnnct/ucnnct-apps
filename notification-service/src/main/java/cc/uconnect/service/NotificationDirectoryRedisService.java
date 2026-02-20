package cc.uconnect.service;

import cc.uconnect.configs.NotificationServiceProperties;
import cc.uconnect.model.GroupInfo;
import cc.uconnect.model.UserContact;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

@Service
@Log4j2
@RequiredArgsConstructor
public class NotificationDirectoryRedisService {

    private final ReactiveStringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final NotificationServiceProperties properties;

    public Mono<UserContact> findUser(String userId) {
        if (userId == null || userId.isBlank()) {
            return Mono.empty();
        }
        String key = properties.getDirectory().getUserKeyPrefix() + userId;
        return redisTemplate.opsForValue()
                .get(key)
                .flatMap(raw -> decodeUser(userId, raw));
    }

    public Mono<GroupInfo> findGroup(String groupId) {
        if (groupId == null || groupId.isBlank()) {
            return Mono.empty();
        }
        String key = properties.getDirectory().getGroupKeyPrefix() + groupId;
        return redisTemplate.opsForValue()
                .get(key)
                .flatMap(raw -> decodeGroup(groupId, raw));
    }

    private Mono<UserContact> decodeUser(String userId, String rawValue) {
        if (rawValue == null || rawValue.isBlank()) {
            return Mono.empty();
        }
        if (!looksLikeJson(rawValue)) {
            return Mono.just(UserContact.builder()
                    .userId(userId)
                    .displayName(rawValue.trim())
                    .build());
        }

        return Mono.fromCallable(() -> objectMapper.readValue(rawValue, UserContact.class))
                .map(user -> {
                    if (user.getUserId() == null || user.getUserId().isBlank()) {
                        user.setUserId(userId);
                    }
                    return user;
                })
                .doOnError(ex -> log.warn("Failed to decode user directory cache key={}{} payload={}",
                        properties.getDirectory().getUserKeyPrefix(),
                        userId,
                        rawValue,
                        ex))
                .onErrorResume(ex -> Mono.empty());
    }

    private Mono<GroupInfo> decodeGroup(String groupId, String rawValue) {
        if (rawValue == null || rawValue.isBlank()) {
            return Mono.empty();
        }
        if (!looksLikeJson(rawValue)) {
            return Mono.just(GroupInfo.builder()
                    .groupId(groupId)
                    .name(rawValue.trim())
                    .build());
        }

        return Mono.fromCallable(() -> objectMapper.readValue(rawValue, GroupInfo.class))
                .map(group -> {
                    if (group.getGroupId() == null || group.getGroupId().isBlank()) {
                        group.setGroupId(groupId);
                    }
                    return group;
                })
                .doOnError(ex -> log.warn("Failed to decode group directory cache key={}{} payload={}",
                        properties.getDirectory().getGroupKeyPrefix(),
                        groupId,
                        rawValue,
                        ex))
                .onErrorResume(ex -> Mono.empty());
    }

    private boolean looksLikeJson(String rawValue) {
        String value = rawValue.trim();
        return value.startsWith("{") && value.endsWith("}");
    }
}
