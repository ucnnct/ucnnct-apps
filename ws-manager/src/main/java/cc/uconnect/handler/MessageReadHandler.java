package cc.uconnect.handler;

import cc.uconnect.enums.MessageType;
import cc.uconnect.enums.WsInboundActionType;
import cc.uconnect.enums.WsOutboundActionType;
import cc.uconnect.model.Message;
import cc.uconnect.service.WsMessagePayloadDecoder;
import cc.uconnect.service.WsOutboundPacketService;
import cc.uconnect.service.WsUserPacketRoutingService;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.util.List;

@Component
@Log4j2
@RequiredArgsConstructor
public class MessageReadHandler implements WsInboundActionHandler {

    private final WsMessagePayloadDecoder messagePayloadDecoder;
    private final WsOutboundPacketService outboundPacketService;
    private final WsUserPacketRoutingService userPacketRoutingService;

    @Override
    public WsInboundActionType actionType() {
        return WsInboundActionType.MESSAGE_READ;
    }

    @Override
    public Mono<Void> handle(String readerUserId, JsonNode payload) {
        return messagePayloadDecoder.decodeReceiptPayload(payload)
                .map(message -> enrichMessage(message, readerUserId))
                .flatMap(message -> userPacketRoutingService.routeToUser(
                        message.getSenderId(),
                        resolveOutboundAction(message.getType()),
                        message))
                .onErrorResume(ex -> {
                    log.warn("MESSAGE_READ processing error readerUserId={}", readerUserId, ex);
                    return outboundPacketService.sendErrorToUser(readerUserId, ex.getMessage());
                });
    }

    private Message enrichMessage(Message message, String readerUserId) {
        message.setReceiversId(List.of(readerUserId));
        message.setStatus("READ");
        return message;
    }

    private WsOutboundActionType resolveOutboundAction(MessageType messageType) {
        if (messageType == MessageType.GROUP) {
            return WsOutboundActionType.GROUP_MESSAGE_READ_CONFIRMED;
        }
        return WsOutboundActionType.MESSAGE_READ_CONFIRMED;
    }
}
