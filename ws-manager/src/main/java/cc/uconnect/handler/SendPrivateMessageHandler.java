package cc.uconnect.handler;

import cc.uconnect.enums.WsInboundActionType;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

@Component
@Log4j2
public class SendPrivateMessageHandler implements WsInboundActionHandler {

    @Override
    public WsInboundActionType actionType() {
        return WsInboundActionType.SEND_PRIVATE_MESSAGE;
    }

    @Override
    public Mono<Void> handle(JsonNode payload) {
        log.debug("handle SEND_PRIVATE_MESSAGE payload={}", payload);
        return Mono.empty();
    }
}
