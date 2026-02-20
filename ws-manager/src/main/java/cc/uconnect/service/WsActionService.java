package cc.uconnect.service;

import cc.uconnect.enums.WsInboundActionType;
import cc.uconnect.enums.WsOutboundActionType;
import cc.uconnect.handler.WsInboundActionHandler;
import cc.uconnect.model.WsPacket;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class WsActionService {

    private final WsOutboundPacketService outboundPacketService;
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

        WsInboundActionHandler actionHandler = handlersByType.get(actionType);
        if (actionHandler == null) {
            return sendError(userId, "No handler registered for action type: " + actionType);
        }
        return actionHandler.handle(userId, packet.getPayload());
    }

    public Mono<Void> sendError(String userId, String errorMessage) {
        return outboundPacketService.sendErrorToUser(userId, errorMessage);
    }

    public Mono<Void> sendToFront(String targetUserId, WsOutboundActionType actionType, Object actionPayload) {
        return outboundPacketService.sendToUser(targetUserId, actionType, actionPayload);
    }
}
