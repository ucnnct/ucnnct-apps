package cc.uconnect.service;

import cc.uconnect.enums.WsOutboundActionType;
import cc.uconnect.model.WsPacket;
import cc.uconnect.model.WsRoutedPacket;
import cc.uconnect.publisher.WsRedisPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.util.function.Supplier;

@Service
@Log4j2
@RequiredArgsConstructor
public class WsUserPacketRoutingService {

    private final WsSessionPacketSender packetSender;
    private final WsPresenceRedisService presenceRedisService;
    private final WsRedisPubSubService redisPubSubService;
    private final WsRedisPublisher redisPublisher;
    private final WsOutboundPacketService outboundPacketService;

    public Mono<Void> routeToUser(String targetUserId, WsOutboundActionType actionType, Object payload) {
        return routeToUserInternal(
                targetUserId,
                actionType.name(),
                () -> outboundPacketService.sendToUser(targetUserId, actionType, payload),
                () -> outboundPacketService.buildPacket(actionType, payload));
    }

    private Mono<Void> routeToUserInternal(
            String targetUserId,
            String actionName,
            Supplier<Mono<Void>> localSendSupplier,
            Supplier<WsPacket> packetBuilder) {
        if (targetUserId == null || targetUserId.isBlank()) {
            return Mono.fromRunnable(() ->
                    log.warn("Cannot route packet: targetUserId is missing action={}", actionName));
        }

        if (packetSender.hasLocalUser(targetUserId)) {
            return localSendSupplier.get();
        }

        return presenceRedisService.findInstanceByUserId(targetUserId)
                .flatMap(instanceId -> {
                    if (instanceId == null || instanceId.isBlank()) {
                        log.debug("Target user not present in Redis targetUserId={} action={}",
                                targetUserId,
                                actionName);
                        return Mono.empty();
                    }

                    if (instanceId.equals(redisPubSubService.localInstanceId())) {
                        return localSendSupplier.get();
                    }

                    WsPacket packet = packetBuilder.get();
                    WsRoutedPacket routedPacket = WsRoutedPacket.builder()
                            .targetUserId(targetUserId)
                            .packet(packet)
                            .build();
                    return redisPublisher.publishToInstance(instanceId, routedPacket);
                })
                .switchIfEmpty(Mono.fromRunnable(() ->
                        log.debug("No active instance found for targetUserId={} action={}",
                                targetUserId,
                                actionName)))
                .then();
    }
}
