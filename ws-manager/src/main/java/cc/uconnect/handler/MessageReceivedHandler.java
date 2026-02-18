package cc.uconnect.handler;

import cc.uconnect.enums.MessageType;
import cc.uconnect.enums.WsInboundActionType;
import cc.uconnect.enums.WsOutboundActionType;
import cc.uconnect.model.Message;
import cc.uconnect.publisher.WsMessageKafkaPublisher;
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
public class MessageReceivedHandler implements WsInboundActionHandler {

    private final WsMessagePayloadDecoder messagePayloadDecoder;
    private final WsMessageKafkaPublisher messageKafkaPublisher;
    private final WsOutboundPacketService outboundPacketService;
    private final WsUserPacketRoutingService userPacketRoutingService;

    @Override
    public WsInboundActionType actionType() {
        return WsInboundActionType.MESSAGE_RECEIVED;
    }

    @Override
    public Mono<Void> handle(String receiverUserId, JsonNode payload) {
        return messagePayloadDecoder.decodeReceiptPayload(payload)
                .map(message -> enrichMessage(message, receiverUserId))
                .flatMap(message -> messageKafkaPublisher.publishStatusUpdate(message)
                        .then(userPacketRoutingService.routeToUser(
                                message.getSenderId(),
                                resolveOutboundAction(message.getType()),
                                message)))
                .onErrorResume(ex -> {
                    log.warn("MESSAGE_RECEIVED processing error receiverUserId={}", receiverUserId, ex);
                    return outboundPacketService.sendErrorToUser(receiverUserId, ex.getMessage());
                });
    }

    private Message enrichMessage(Message message, String receiverUserId) {
        message.setReceiversId(List.of(receiverUserId));
        message.setStatus("RECEIVED");
        return message;
    }

    private WsOutboundActionType resolveOutboundAction(MessageType messageType) {
        if (messageType == MessageType.GROUP) {
            return WsOutboundActionType.GROUP_MESSAGE_RECEIVED_CONFIRMED;
        }
        return WsOutboundActionType.MESSAGE_RECEIVED_CONFIRMED;
    }
}
