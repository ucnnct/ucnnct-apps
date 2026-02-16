package cc.uconnect.service.handler;

import cc.uconnect.model.WsInboundActionType;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

@Component
@Log4j2
public class SendGroupMessageHandler implements WsInboundActionHandler {

    @Override
    public WsInboundActionType actionType() {
        return WsInboundActionType.SEND_GROUP_MESSAGE;
    }

    @Override
    public Mono<Void> handle(JsonNode payload) {
        log.debug("handle SEND_GROUP_MESSAGE payload={}", payload);
        return Mono.empty();
    }
}
