package cc.uconnect.handler;

import cc.uconnect.enums.WsInboundActionType;
import cc.uconnect.enums.MessageType;
import cc.uconnect.model.Message;
import cc.uconnect.publisher.WsMessageKafkaPublisher;
import cc.uconnect.service.WsOutboundPacketService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

@Component
@Log4j2
@RequiredArgsConstructor
public class SendGroupMessageHandler implements WsInboundActionHandler {

    private final ObjectMapper objectMapper;
    private final WsOutboundPacketService outboundPacketService;
    private final WsMessageKafkaPublisher messageKafkaPublisher;

    @Override
    public WsInboundActionType actionType() {
        return WsInboundActionType.SEND_GROUP_MESSAGE;
    }

    @Override
    public Mono<Void> handle(String senderUserId, JsonNode payload) {
        return decodeMessagePayload(payload)
                .map(message -> {
                    message.setType(MessageType.GROUP);
                    message.setSenderId(senderUserId);
                    return message;
                })
                .flatMap(messageKafkaPublisher::publishToGroupResolve)
                .onErrorResume(ex -> {
                    log.warn("SEND_GROUP_MESSAGE processing error senderUserId={}", senderUserId, ex);
                    return outboundPacketService.sendErrorToUser(senderUserId, ex.getMessage());
                });
    }

    private Mono<Message> decodeMessagePayload(JsonNode payload) {
        return Mono.fromCallable(() -> {
                    if (payload == null || payload.isNull()) {
                        throw new IllegalArgumentException("payload is required");
                    }
                    Message message = objectMapper.treeToValue(payload, Message.class);
                    if (message.getGroupId() == null || message.getGroupId().isBlank()) {
                        throw new IllegalArgumentException("groupId is required");
                    }
                    return message;
                })
                .subscribeOn(Schedulers.boundedElastic());
    }
}
