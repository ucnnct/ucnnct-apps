package cc.uconnect.service;

import cc.uconnect.model.WsInboundActionType;
import cc.uconnect.model.WsOutboundActionType;
import cc.uconnect.model.WsPacket;
import cc.uconnect.service.handler.WsInboundActionHandler;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Service
@Log4j2
@RequiredArgsConstructor
public class WsActionService {

    private final ObjectMapper objectMapper;
    private final WsSessionPacketSender packetSender;
    private final List<WsInboundActionHandler> inboundActionHandlers;
    private final Map<WsInboundActionType, WsInboundActionHandler> handlersByType = new EnumMap<>(WsInboundActionType.class);

    @PostConstruct
    public void init() {
        for (WsInboundActionHandler actionHandler : inboundActionHandlers) {
            WsInboundActionHandler existing = handlersByType.putIfAbsent(actionHandler.actionType(), actionHandler);
            if (existing != null) {
                throw new IllegalStateException("Duplicate handler for action type " + actionHandler.actionType());
            }
        }
    }

    public Mono<Void> handleInboundPacket(String userId, WsPacket packet) {
        WsInboundActionType actionType = WsInboundActionType.from(packet.getType()).orElse(null);
        if (actionType == null) {
            return sendError(userId, "Unsupported action type: " + packet.getType());
        }

        JsonNode payload = packet.getPayload();
        WsInboundActionHandler actionHandler = handlersByType.get(actionType);
        if (actionHandler == null) {
            return sendError(userId, "No handler registered for action type: " + actionType);
        }
        return actionHandler.handle(payload);
    }

    public Mono<Void> sendError(String userId, String errorMessage) {
        return Mono.fromRunnable(() -> emit(userId, WsOutboundActionType.ERROR, errorMessage));
    }

    private void emit(String targetUserId, WsOutboundActionType actionType, Object payload) {
        WsPacket packet = WsPacket.builder()
                .type(actionType.name())
                .timestamp(Instant.now().toEpochMilli())
                .payload(payload == null ? null : objectMapper.valueToTree(payload))
                .build();

        boolean delivered = packetSender.sendPacketToUser(targetUserId, packet);
        if (!delivered) {
            log.debug("Packet not delivered action={} targetUserId={}", actionType, targetUserId);
        }
    }
}
