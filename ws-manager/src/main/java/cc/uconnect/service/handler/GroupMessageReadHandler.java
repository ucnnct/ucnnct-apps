package cc.uconnect.service.handler;

import cc.uconnect.model.WsInboundActionType;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

@Component
@Log4j2
public class GroupMessageReadHandler implements WsInboundActionHandler {

    @Override
    public WsInboundActionType actionType() {
        return WsInboundActionType.GROUP_MESSAGE_READ;
    }

    @Override
    public Mono<Void> handle(JsonNode payload) {
        log.debug("handle GROUP_MESSAGE_READ payload={}", payload);
        return Mono.empty();
    }
}
