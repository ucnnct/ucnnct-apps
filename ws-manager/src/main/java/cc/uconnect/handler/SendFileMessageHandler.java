package cc.uconnect.handler;

import cc.uconnect.enums.MessageType;
import cc.uconnect.enums.WsInboundActionType;
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
public class SendFileMessageHandler implements WsInboundActionHandler {

    private final WsMessagePayloadDecoder messagePayloadDecoder;
    private final WsOutboundPacketService outboundPacketService;
    private final WsMessageKafkaPublisher messageKafkaPublisher;

    @Override
    public WsInboundActionType actionType() {
        return WsInboundActionType.SEND_FILE_MESSAGE;
    }

    @Override
    public Mono<Void> handle(String senderUserId, JsonNode payload) {
        return messagePayloadDecoder.decodeFileMessagePayload(payload)
                .map(message -> {
                    message.setSenderId(senderUserId);
                    message.setType(resolveConversationType(message));
                    return message;
                })
                .doOnNext(message -> log.info("FLOW ws.inbound action=SEND_FILE_MESSAGE senderId={} messageId={} type={} groupId={} step=ws.receive-file",
                        senderUserId,
                        message.getMessageId(),
                        message.getType(),
                        message.getGroupId()))
                .flatMap(message -> {
                    if (message.getType() == MessageType.GROUP) {
                        return messageKafkaPublisher.publishToGroupResolve(message);
                    }
                    return messageKafkaPublisher.publishToChat(message);
                })
                .onErrorResume(ex -> {
                    log.warn("SEND_FILE_MESSAGE processing error senderUserId={}", senderUserId, ex);
                    return outboundPacketService.sendErrorToUser(senderUserId, ex.getMessage());
                });
    }

    private MessageType resolveConversationType(Message message) {
        if (message.getGroupId() != null && !message.getGroupId().isBlank()) {
            return MessageType.GROUP;
        }
        return MessageType.PRIVATE;
    }
}
