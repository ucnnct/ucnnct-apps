package cc.uconnect.handler;

import cc.uconnect.enums.WsInboundActionType;
import cc.uconnect.model.UserActiveContext;
import cc.uconnect.service.WsOutboundPacketService;
import cc.uconnect.service.WsPresenceRedisService;
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
public class UpdateActiveContextHandler implements WsInboundActionHandler {

    private final ObjectMapper objectMapper;
    private final WsPresenceRedisService presenceRedisService;
    private final WsOutboundPacketService outboundPacketService;

    @Override
    public WsInboundActionType actionType() {
        return WsInboundActionType.UPDATE_ACTIVE_CONTEXT;
    }

    @Override
    public Mono<Void> handle(String senderUserId, JsonNode payload) {
        return decodePayload(payload)
                .flatMap(context -> presenceRedisService.saveUserActiveContext(senderUserId, context))
                .onErrorResume(ex -> {
                    log.warn("UPDATE_ACTIVE_CONTEXT processing error userId={}", senderUserId, ex);
                    return outboundPacketService.sendErrorToUser(senderUserId, ex.getMessage());
                });
    }

    private Mono<UserActiveContext> decodePayload(JsonNode payload) {
        return Mono.fromCallable(() -> {
                    if (payload == null || payload.isNull()) {
                        throw new IllegalArgumentException("payload is required");
                    }
                    UserActiveContext context = objectMapper.treeToValue(payload, UserActiveContext.class);
                    if (context.getPage() == null || context.getPage().isBlank()) {
                        throw new IllegalArgumentException("page is required");
                    }
                    return context;
                })
                .subscribeOn(Schedulers.boundedElastic());
    }
}
