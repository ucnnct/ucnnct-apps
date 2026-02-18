package cc.uconnect.service;

import cc.uconnect.enums.MessageType;
import cc.uconnect.model.Message;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

@Service
@RequiredArgsConstructor
public class WsMessagePayloadDecoder {

    private final ObjectMapper objectMapper;

    public Mono<Message> decodeReceiptPayload(JsonNode payload) {
        return decodePayload(payload)
                .map(message -> {
                    if (message.getMessageId() == null || message.getMessageId().isBlank()) {
                        throw new IllegalArgumentException("messageId is required");
                    }
                    if (message.getSenderId() == null || message.getSenderId().isBlank()) {
                        throw new IllegalArgumentException("senderId is required");
                    }
                    message.setType(resolveMessageType(message));
                    return message;
                });
    }

    public Mono<Message> decodePrivateMessagePayload(JsonNode payload) {
        return decodePayload(payload)
                .map(message -> {
                    if (message.getReceiversId() == null || message.getReceiversId().isEmpty()) {
                        throw new IllegalArgumentException("receiversId is required");
                    }
                    if (message.getReceiversId().size() != 1) {
                        throw new IllegalArgumentException("Private message requires exactly one receiver id");
                    }
                    return message;
                });
    }

    public Mono<Message> decodeGroupMessagePayload(JsonNode payload) {
        return decodePayload(payload)
                .map(message -> {
                    if (message.getGroupId() == null || message.getGroupId().isBlank()) {
                        throw new IllegalArgumentException("groupId is required");
                    }
                    return message;
                });
    }

    private Mono<Message> decodePayload(JsonNode payload) {
        return Mono.fromCallable(() -> {
                    if (payload == null || payload.isNull()) {
                        throw new IllegalArgumentException("payload is required");
                    }
                    return objectMapper.treeToValue(payload, Message.class);
                })
                .subscribeOn(Schedulers.boundedElastic());
    }

    private MessageType resolveMessageType(Message message) {
        if (message.getType() != null) {
            return message.getType();
        }
        if (message.getGroupId() != null && !message.getGroupId().isBlank()) {
            return MessageType.GROUP;
        }
        return MessageType.PRIVATE;
    }
}
