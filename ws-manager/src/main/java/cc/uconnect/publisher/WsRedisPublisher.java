package cc.uconnect.publisher;

import cc.uconnect.model.WsRoutedPacket;
import cc.uconnect.service.WsRedisPubSubService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

@Service
@Log4j2
@RequiredArgsConstructor
public class WsRedisPublisher {

    private final ReactiveStringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final WsRedisPubSubService pubSubService;

    public Mono<Void> publishToInstance(String instanceId, WsRoutedPacket routedPacket) {
        String channel = pubSubService.instanceChannel(instanceId);
        return Mono.fromCallable(() -> objectMapper.writeValueAsString(routedPacket))
                .subscribeOn(Schedulers.boundedElastic())
                .flatMap(serialized -> redisTemplate.convertAndSend(channel, serialized))
                .doOnNext(receivers ->
                        log.debug("Redis publish routedPacket channel={} targetUserId={} receivers={}",
                                channel,
                                routedPacket.getTargetUserId(),
                                receivers))
                .then();
    }
}
