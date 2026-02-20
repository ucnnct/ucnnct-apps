package cc.uconnect.consumer;

import cc.uconnect.enums.MessageType;
import cc.uconnect.enums.WsOutboundActionType;
import cc.uconnect.model.Message;
import cc.uconnect.service.WsUserPacketRoutingService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;

@Service
@Log4j2
@RequiredArgsConstructor
public class WsMessageKafkaConsumer {

    private final ObjectMapper objectMapper;
    private final WsUserPacketRoutingService userPacketRoutingService;

    @KafkaListener(
            topics = "${app.kafka.topics.messages:message.persisted}",
            groupId = "${spring.kafka.consumer.group-id:ws-manager-message-delivery}"
    )
    public void onPersistedMessage(String rawPayload) {
        try {
            Message message = objectMapper.readValue(rawPayload, Message.class);
            if (!isReadyForDelivery(message)) {
                log.debug("Skipping Kafka message not ready for delivery type={} messageId={} groupId={}",
                        message.getType(),
                        message.getMessageId(),
                        message.getGroupId());
                return;
            }
            routePersistedMessage(message)
                    .onErrorResume(ex -> {
                        log.error("Failed to deliver persisted message receiversId={}", message.getReceiversId(), ex);
                        return Mono.empty();
                    })
                    .block();
        } catch (Exception ex) {
            log.error("Failed to parse Kafka message payload={}", rawPayload, ex);
        }
    }

    private boolean isReadyForDelivery(Message message) {
        if (message == null) {
            return false;
        }
        if (message.getMessageId() == null || message.getMessageId().isBlank()) {
            return false;
        }
        if (message.getType() == null) {
            return false;
        }
        return message.getReceiversId() != null && !message.getReceiversId().isEmpty();
    }

    private Mono<Void> routePersistedMessage(Message message) {
        List<String> targetUserIds = message.getReceiversId().stream()
                .filter(targetUserId -> targetUserId != null && !targetUserId.isBlank())
                .distinct()
                .toList();

        if (targetUserIds.isEmpty()) {
            log.warn("Cannot deliver message: receiversId contains no valid user id messageId={}", message.getMessageId());
            return Mono.empty();
        }

        if (message.getType() == MessageType.PRIVATE && targetUserIds.size() > 1) {
            log.warn("Private message has multiple receiversId, only first id will be used messageId={} senderId={} receiversCount={}",
                    message.getMessageId(),
                    message.getSenderId(),
                    targetUserIds.size());
            targetUserIds = List.of(targetUserIds.get(0));
        }

        WsOutboundActionType actionType = resolveOutboundAction(message);
        return Flux.fromIterable(targetUserIds)
                .concatMap(targetUserId -> userPacketRoutingService.routeToUser(targetUserId, actionType, message))
                .then(sendSentAckToSender(message))
                .then();
    }

    private WsOutboundActionType resolveOutboundAction(Message message) {
        if (isFileMessage(message)) {
            return WsOutboundActionType.FILE_MESSAGE;
        }
        if (message.getType() == MessageType.GROUP) {
            return WsOutboundActionType.GROUP_MESSAGE;
        }
        return WsOutboundActionType.PRIVATE_MESSAGE;
    }

    private Mono<Void> sendSentAckToSender(Message message) {
        if (message.getSenderId() == null || message.getSenderId().isBlank()) {
            log.debug("Skip sender ack because senderId is missing messageId={}", message.getMessageId());
            return Mono.empty();
        }
        WsOutboundActionType ackActionType = resolveSentAckAction(message);
        return userPacketRoutingService.routeToUser(message.getSenderId(), ackActionType, message);
    }

    private WsOutboundActionType resolveSentAckAction(Message message) {
        if (isFileMessage(message)) {
            return WsOutboundActionType.FILE_MESSAGE_SENT_ACK;
        }
        if (message.getType() == MessageType.GROUP) {
            return WsOutboundActionType.GROUP_MESSAGE_SENT_ACK;
        }
        return WsOutboundActionType.MESSAGE_SENT_ACK;
    }

    private boolean isFileMessage(Message message) {
        return message.getObjectKey() != null && !message.getObjectKey().isBlank();
    }
}
