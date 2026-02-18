package cc.uconnect.service;

import cc.uconnect.enums.MessageType;
import cc.uconnect.model.Message;
import cc.uconnect.model.WsPacket;
import cc.uconnect.model.WsRoutedPacket;
import cc.uconnect.publisher.WsRedisPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;

@Service
@Log4j2
@RequiredArgsConstructor
public class WsMessageDeliveryService {

    private final WsSessionPacketSender packetSender;
    private final WsPresenceRedisService presenceRedisService;
    private final WsRedisPubSubService redisPubSubService;
    private final WsRedisPublisher redisPublisher;
    private final WsOutboundPacketService outboundPacketService;

    public Mono<Void> deliverMessage(Message message) {
        if (message == null || message.getReceiversId() == null || message.getReceiversId().isEmpty()) {
            return Mono.fromRunnable(() -> log.warn("Cannot deliver message: receiversId is missing"));
        }

        List<String> targetUserIds = message.getReceiversId().stream()
                .filter(targetUserId -> targetUserId != null && !targetUserId.isBlank())
                .distinct()
                .toList();

        if (targetUserIds.isEmpty()) {
            return Mono.fromRunnable(() -> log.warn("Cannot deliver message: receiversId contains no valid user id"));
        }

        if (message.getType() == MessageType.PRIVATE && targetUserIds.size() > 1) {
            log.warn("Private message has multiple receiversId, only first id will be used senderId={} receiversCount={}",
                    message.getSenderId(),
                    targetUserIds.size());
            targetUserIds = List.of(targetUserIds.get(0));
        }

        return Flux.fromIterable(targetUserIds)
                .concatMap(targetUserId -> deliverToTarget(targetUserId, message))
                .then();
    }

    private Mono<Void> deliverToTarget(String targetUserId, Message message) {
        if (packetSender.hasLocalUser(targetUserId)) {
            return outboundPacketService.sendMessageToUser(targetUserId, message);
        }

        return presenceRedisService.findInstanceByUserId(targetUserId)
                .flatMap(instanceId -> {
                    if (instanceId == null || instanceId.isBlank()) {
                        log.debug("Target user not present in Redis targetUserId={}", targetUserId);
                        return Mono.empty();
                    }

                    if (instanceId.equals(redisPubSubService.localInstanceId())) {
                        return outboundPacketService.sendMessageToUser(targetUserId, message);
                    }

                    WsPacket packet = outboundPacketService.buildMessagePacket(message);
                    WsRoutedPacket routedPacket = WsRoutedPacket.builder()
                            .targetUserId(targetUserId)
                            .packet(packet)
                            .build();
                    return redisPublisher.publishToInstance(instanceId, routedPacket);
                })
                .switchIfEmpty(Mono.fromRunnable(() ->
                        log.debug("No active instance found for targetUserId={}", targetUserId)))
                .then();
    }
}
