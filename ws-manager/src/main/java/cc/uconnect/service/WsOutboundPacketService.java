package cc.uconnect.service;

import cc.uconnect.enums.MessageType;
import cc.uconnect.enums.WsOutboundActionType;
import cc.uconnect.model.Message;
import cc.uconnect.model.WsPacket;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.Map;

@Service
@Log4j2
@RequiredArgsConstructor
public class WsOutboundPacketService {

    private final ObjectMapper objectMapper;
    private final WsSessionPacketSender packetSender;

    public Mono<Void> sendToUser(String targetUserId, WsOutboundActionType actionType, Object actionPayload) {
        return Mono.fromRunnable(() -> {
            WsPacket packet = buildPacket(actionType, actionPayload);

            traceOutbound(targetUserId, actionType, actionPayload);

            boolean delivered = packetSender.sendPacketToUser(targetUserId, packet);
            if (!delivered) {
                log.debug("Outbound not delivered action={} targetUserId={}", actionType, targetUserId);
            }
        });
    }

    public Mono<Void> sendMessageToUser(String targetUserId, Message message) {
        return Mono.fromRunnable(() -> {
            WsPacket packet = buildMessagePacket(message);
            boolean delivered = packetSender.sendPacketToUser(targetUserId, packet);
            if (!delivered) {
                log.debug("Message outbound not delivered type={} targetUserId={}",
                        packet.getType(),
                        targetUserId);
            }
        });
    }

    public Mono<Void> sendErrorToUser(String targetUserId, String message) {
        return sendToUser(targetUserId, WsOutboundActionType.ERROR, Map.of("message", message));
    }

    public WsPacket buildPacket(WsOutboundActionType actionType, Object actionPayload) {
        return WsPacket.builder()
                .type(actionType.name())
                .timestamp(Instant.now().toEpochMilli())
                .payload(actionPayload == null ? null : objectMapper.valueToTree(actionPayload))
                .build();
    }

    public WsPacket buildMessagePacket(Message message) {
        WsOutboundActionType actionType = resolveMessageAction(message);
        return buildPacket(actionType, message);
    }

    private WsOutboundActionType resolveMessageAction(Message message) {
        if (message != null && message.getType() == MessageType.GROUP) {
            return WsOutboundActionType.GROUP_MESSAGE;
        }
        return WsOutboundActionType.PRIVATE_MESSAGE;
    }

    private void traceOutbound(String targetUserId, WsOutboundActionType actionType, Object actionPayload) {
        String payloadType = actionPayload == null ? "null" : actionPayload.getClass().getSimpleName();
        log.debug("WS outbound trace action={} targetUserId={} payloadType={}",
                actionType,
                targetUserId,
                payloadType);
    }
}
