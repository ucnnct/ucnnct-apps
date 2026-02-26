package cc.uconnect.handler;

import cc.uconnect.enums.WsInboundActionType;
import cc.uconnect.enums.MessageType;
import cc.uconnect.model.Message;
import cc.uconnect.publisher.WsMessageKafkaPublisher;
import cc.uconnect.service.WsMessagePayloadDecoder;
import cc.uconnect.service.WsOutboundPacketService;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

@Component
@Log4j2
@RequiredArgsConstructor
public class SendPrivateMessageHandler implements WsInboundActionHandler {

    private final WsMessagePayloadDecoder messagePayloadDecoder;
    private final WsOutboundPacketService outboundPacketService;
    private final WsMessageKafkaPublisher messageKafkaPublisher;

    @Override
    public WsInboundActionType actionType() {
        return WsInboundActionType.SEND_PRIVATE_MESSAGE;
    }

    @Override
    public Mono<Void> handle(String senderUserId, JsonNode payload) {
        return messagePayloadDecoder.decodePrivateMessagePayload(payload)
                .map(message -> {
                    message.setType(MessageType.PRIVATE);
                    message.setSenderId(senderUserId);
                    return message;
                })
                .doOnNext(message -> log.info("FLOW ws.inbound action=SEND_PRIVATE_MESSAGE senderId={} messageId={} receiversCount={} step=ws.receive-private",
                        senderUserId,
                        message.getMessageId(),
                        message.getReceiversId() == null ? 0 : message.getReceiversId().size()))
                .flatMap(messageKafkaPublisher::publishToChat)
                .onErrorResume(ex -> {
                    log.warn("SEND_PRIVATE_MESSAGE processing error senderUserId={}", senderUserId, ex);
                    return outboundPacketService.sendErrorToUser(senderUserId, ex.getMessage());
                });
    }
}
