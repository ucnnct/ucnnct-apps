package cc.uconnect.handler;

import cc.uconnect.enums.WsInboundActionType;
import cc.uconnect.enums.WsOutboundActionType;
import cc.uconnect.model.PresenceSubscribeRequest;
import cc.uconnect.service.WsOutboundPacketService;
import cc.uconnect.service.WsPresenceSubscriptionService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

@Component
@Log4j2
@RequiredArgsConstructor
public class PresenceSubscribeHandler implements WsInboundActionHandler {

    private final ObjectMapper objectMapper;
    private final WsPresenceSubscriptionService presenceSubscriptionService;
    private final WsOutboundPacketService outboundPacketService;

    @Override
    public WsInboundActionType actionType() {
        return WsInboundActionType.PRESENCE_SUBSCRIBE;
    }

    @Override
    public Mono<Void> handle(String senderUserId, JsonNode payload) {
        return decodePayload(payload)
                .flatMap(request -> presenceSubscriptionService.replaceSubscriptions(
                                senderUserId,
                                request.getUserIds())
                        .flatMapMany(Flux::fromIterable)
                        .concatMap(update -> outboundPacketService.sendToUser(
                                senderUserId,
                                WsOutboundActionType.PRESENCE_UPDATE,
                                update))
                        .then())
                .onErrorResume(ex -> {
                    log.warn("PRESENCE_SUBSCRIBE processing error senderUserId={}", senderUserId, ex);
                    return outboundPacketService.sendErrorToUser(senderUserId, ex.getMessage());
                });
    }

    private Mono<PresenceSubscribeRequest> decodePayload(JsonNode payload) {
        return Mono.fromCallable(() -> {
                    if (payload == null || payload.isNull()) {
                        return PresenceSubscribeRequest.builder().build();
                    }
                    return objectMapper.treeToValue(payload, PresenceSubscribeRequest.class);
                })
                .subscribeOn(Schedulers.boundedElastic());
    }
}
