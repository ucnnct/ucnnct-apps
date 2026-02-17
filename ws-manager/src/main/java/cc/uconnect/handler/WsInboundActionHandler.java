package cc.uconnect.handler;

import cc.uconnect.enums.WsInboundActionType;
import com.fasterxml.jackson.databind.JsonNode;
import reactor.core.publisher.Mono;

public interface WsInboundActionHandler {

    WsInboundActionType actionType();

    Mono<Void> handle(JsonNode payload);
}
