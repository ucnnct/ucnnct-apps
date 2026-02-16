package cc.uconnect.service.handler;

import cc.uconnect.model.WsInboundActionType;
import com.fasterxml.jackson.databind.JsonNode;
import reactor.core.publisher.Mono;

public interface WsInboundActionHandler {

    WsInboundActionType actionType();

    Mono<Void> handle(JsonNode payload);
}
