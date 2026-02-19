package cc.uconnect.service;

import cc.uconnect.configs.NotificationServiceProperties;
import cc.uconnect.model.PresenceSnapshot;
import cc.uconnect.model.UserActiveContext;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;
import reactor.util.function.Tuple2;

@Service
@Log4j2
@RequiredArgsConstructor
public class RedisPresenceContextService {

    private final ReactiveStringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final NotificationServiceProperties properties;

    public Mono<PresenceSnapshot> getPresenceSnapshot(String userId) {
        String presenceKey = properties.getPresence().getKeyPrefix() + userId;
        String contextKey = properties.getActiveContext().getKeyPrefix() + userId;

        Mono<String> instanceMono = redisTemplate.opsForValue().get(presenceKey).defaultIfEmpty("");
        Mono<UserActiveContext> contextMono = redisTemplate.opsForValue()
                .get(contextKey)
                .flatMap(this::decodeContext)
                .defaultIfEmpty(UserActiveContext.empty());

                
        return Mono.zip(instanceMono, contextMono)
                .map(tuple -> buildPresenceSnapshot(userId, tuple));
    }

    private Mono<UserActiveContext> decodeContext(String rawContext) {
        return Mono.fromCallable(() -> objectMapper.readValue(rawContext, UserActiveContext.class))
                .doOnError(ex -> log.warn("Failed to decode user active context payload={}", rawContext, ex))
                .onErrorResume(ex -> Mono.just(UserActiveContext.empty()));
    }

    private PresenceSnapshot buildPresenceSnapshot(String userId, Tuple2<String, UserActiveContext> tuple) {
        String instanceId = tuple.getT1();
        boolean online = instanceId != null && !instanceId.isBlank();
        return PresenceSnapshot.builder()
                .userId(userId)
                .online(online)
                .instanceId(online ? instanceId : null)
                .activeContext(tuple.getT2())
                .build();
    }
}
