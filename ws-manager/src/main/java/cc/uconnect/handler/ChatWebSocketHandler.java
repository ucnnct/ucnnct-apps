package cc.uconnect.handler;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.socket.WebSocketHandler;
import org.springframework.web.reactive.socket.WebSocketMessage;
import org.springframework.web.reactive.socket.WebSocketSession;

import reactor.core.publisher.Mono;

@Component
public class ChatWebSocketHandler implements WebSocketHandler {

    private static final Logger logger = LogManager.getLogger(ChatWebSocketHandler.class);

    @Override
    public Mono<Void> handle(WebSocketSession session) {

        logger.info("New WebSocket connection: {}", session.getId());

        return session.send(
                session.receive()
                        .map(WebSocketMessage::getPayloadAsText)
                        .doOnNext(msg ->
                                logger.debug("Received from {} : {}", session.getId(), msg)
                        )
                        .map(msg -> "Echo: " + msg)
                        .map(session::textMessage)
        )
        .doFinally(signal ->
                logger.info("Connection closed: {} - Signal: {}", session.getId(), signal)
        );
    }
}