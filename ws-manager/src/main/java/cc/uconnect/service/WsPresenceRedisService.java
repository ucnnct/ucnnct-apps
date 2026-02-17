package cc.uconnect.service;

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

    @Value("${app.presence.key-prefix:ws:presence:user:}")
    private String keyPrefix;

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
}
