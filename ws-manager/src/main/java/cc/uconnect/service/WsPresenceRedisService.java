package cc.uconnect.service;

import cc.uconnect.model.UserActiveContext;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

@Service
@Log4j2
@RequiredArgsConstructor
public class WsPresenceRedisService {

    private final ReactiveStringRedisTemplate redisTemplate;
    private final WsInstanceIdentityService instanceIdentityService;
    private final ObjectMapper objectMapper;

    @Value("${app.presence.key-prefix:ws:presence:user:}")
    private String keyPrefix;

    @Value("${app.active-context.key-prefix:ws:context:user:}")
    private String activeContextKeyPrefix;

    public Mono<Void> saveUserInstance(String userId) {
        String key = keyPrefix + userId;
        String instanceId = instanceIdentityService.getInstanceId();

        return redisTemplate.opsForValue()
                .set(key, instanceId)
                .doOnNext(saved -> {
                    if (Boolean.TRUE.equals(saved)) {
                        log.debug("Presence saved in Redis userId={} instanceId={}", userId, instanceId);
                        return;
                    }
                    log.warn("Presence write in Redis returned false userId={} instanceId={}", userId, instanceId);
                })
                .then();
    }

    public Mono<Void> deleteUserInstance(String userId) {
        String key = keyPrefix + userId;
        return redisTemplate.opsForValue()
                .delete(key)
                .doOnNext(deleted -> {
                    if (Boolean.TRUE.equals(deleted)) {
                        log.debug("Presence deleted in Redis userId={}", userId);
                        return;
                    }
                    log.debug("Presence key not deleted (already absent) userId={}", userId);
                })
                .then();
    }

    public Mono<String> findInstanceByUserId(String userId) {
        String key = keyPrefix + userId;
        return redisTemplate.opsForValue()
                .get(key)
                .doOnNext(instanceId -> log.debug("Presence lookup userId={} instanceId={}", userId, instanceId));
    }

    public Mono<Void> saveUserActiveContext(String userId, UserActiveContext activeContext) {
        if (activeContext == null || activeContext.getPage() == null || activeContext.getPage().isBlank()) {
            return Mono.error(new IllegalArgumentException("active context page is required"));
        }

        UserActiveContext value = UserActiveContext.builder()
                .page(activeContext.getPage())
                .conversationId(activeContext.getConversationId())
                .updatedAt(System.currentTimeMillis())
                .build();

        return Mono.fromCallable(() -> objectMapper.writeValueAsString(value))
                .flatMap(serialized -> redisTemplate.opsForValue().set(activeContextKeyPrefix + userId, serialized))
                .doOnNext(saved -> {
                    if (Boolean.TRUE.equals(saved)) {
                        log.debug("Active context saved userId={} page={} conversationId={}",
                                userId,
                                value.getPage(),
                                value.getConversationId());
                        return;
                    }
                    log.warn("Active context write returned false userId={} page={}",
                            userId,
                            value.getPage());
                })
                .then();
    }

    public Mono<Void> deleteUserActiveContext(String userId) {
        String key = activeContextKeyPrefix + userId;
        return redisTemplate.opsForValue()
                .delete(key)
                .doOnNext(deleted -> {
                    if (Boolean.TRUE.equals(deleted)) {
                        log.debug("Active context deleted userId={}", userId);
                        return;
                    }
                    log.debug("Active context key not deleted (already absent) userId={}", userId);
                })
                .then();
    }
}
