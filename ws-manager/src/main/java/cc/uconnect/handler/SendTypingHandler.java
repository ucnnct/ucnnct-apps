package cc.uconnect.handler;

import cc.uconnect.enums.WsInboundActionType;
import cc.uconnect.enums.WsOutboundActionType;
import cc.uconnect.model.TypingEvent;
import cc.uconnect.service.WsOutboundPacketService;
import cc.uconnect.service.WsUserPacketRoutingService;
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
public class SendTypingHandler implements WsInboundActionHandler {

    private static final long DEFAULT_TTL_MS = 3000L;
    private static final long MAX_TTL_MS = 10_000L;

    private final ObjectMapper objectMapper;
    private final WsUserPacketRoutingService userPacketRoutingService;
    private final WsOutboundPacketService outboundPacketService;

    @Override
    public WsInboundActionType actionType() {
        return WsInboundActionType.SEND_TYPING;
    }

    @Override
    public Mono<Void> handle(String senderUserId, JsonNode payload) {
        return decodePayload(payload)
                .map(request -> normalizeTypingEvent(senderUserId, request))
                .doOnNext(event -> log.info("FLOW ws.inbound action=SEND_TYPING senderId={} targetUserId={} conversationId={} typing={} ttlMs={} step=ws.typing",
                        event.getSenderId(),
                        event.getTargetUserId(),
                        event.getConversationId(),
                        event.getTyping(),
                        event.getTtlMs()))
                .flatMap(event -> userPacketRoutingService.routeToUser(
                        event.getTargetUserId(),
                        WsOutboundActionType.USER_TYPING,
                        event))
                .onErrorResume(ex -> {
                    log.warn("SEND_TYPING processing error senderUserId={}", senderUserId, ex);
                    return outboundPacketService.sendErrorToUser(senderUserId, ex.getMessage());
                });
    }

    private Mono<TypingEvent> decodePayload(JsonNode payload) {
        return Mono.fromCallable(() -> {
                    if (payload == null || payload.isNull()) {
                        throw new IllegalArgumentException("typing payload is required");
                    }
                    return objectMapper.treeToValue(payload, TypingEvent.class);
                })
                .subscribeOn(Schedulers.boundedElastic());
    }

    private TypingEvent normalizeTypingEvent(String senderUserId, TypingEvent request) {
        if (request == null) {
            throw new IllegalArgumentException("typing payload is required");
        }
        String conversationId = normalizeNonBlank(request.getConversationId(), "conversationId is required");
        String targetUserId = normalizeNonBlank(request.getTargetUserId(), "targetUserId is required");
        if (senderUserId.equals(targetUserId)) {
            throw new IllegalArgumentException("sender cannot target itself");
        }

        boolean isTyping = request.getTyping() == null || Boolean.TRUE.equals(request.getTyping());
        long ttlMs = normalizeTtl(request.getTtlMs());
        long now = System.currentTimeMillis();

        return TypingEvent.builder()
                .conversationId(conversationId)
                .senderId(senderUserId)
                .targetUserId(targetUserId)
                .typing(isTyping)
                .ttlMs(ttlMs)
                .updatedAt(now)
                .build();
    }

    private String normalizeNonBlank(String value, String errorMessage) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(errorMessage);
        }
        return value.trim();
    }

    private long normalizeTtl(Long requestedTtlMs) {
        if (requestedTtlMs == null || requestedTtlMs <= 0L) {
            return DEFAULT_TTL_MS;
        }
        return Math.min(requestedTtlMs, MAX_TTL_MS);
    }
}
