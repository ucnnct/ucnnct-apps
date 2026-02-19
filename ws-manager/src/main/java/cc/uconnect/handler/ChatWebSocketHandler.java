package cc.uconnect.handler;

import cc.uconnect.model.WsPacket;
import cc.uconnect.service.WsActionService;
import cc.uconnect.service.WsPresenceRedisService;
import cc.uconnect.service.WsSessionPacketSender;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Component;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.socket.CloseStatus;
import org.springframework.web.reactive.socket.WebSocketHandler;
import org.springframework.web.reactive.socket.WebSocketMessage;
import org.springframework.web.reactive.socket.WebSocketSession;
import org.springframework.web.util.UriComponentsBuilder;

import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;
import reactor.core.scheduler.Schedulers;

import java.net.URI;
import java.util.concurrent.ArrayBlockingQueue;

@Component
@Log4j2
@RequiredArgsConstructor
public class ChatWebSocketHandler implements WebSocketHandler {

    private static final int OUTBOUND_BUFFER_SIZE = 1024;

    private final ObjectMapper objectMapper;
    private final WsSessionPacketSender packetSender;
    private final WsActionService actionService;
    private final WsPresenceRedisService presenceRedisService;

    @Override
    public Mono<Void> handle(WebSocketSession session) {
        String sessionId = session.getId();
        String userId = resolveUserId(session);
        if (userId == null) {
            log.warn("WebSocket rejected: userId is required at connection. sessionId={}", sessionId);
            return session.close(CloseStatus.POLICY_VIOLATION);
        }
        log.info("New WebSocket connection: sessionId={} userId={}", sessionId, userId);

        Sinks.Many<String> outboundSink = Sinks.many()
                .unicast()
                .onBackpressureBuffer(new ArrayBlockingQueue<>(OUTBOUND_BUFFER_SIZE));
        packetSender.register(userId, sessionId, outboundSink);

        Mono<Void> outbound = session.send(outboundSink.asFlux().map(session::textMessage));

        Mono<Void> inbound = session.receive()
                .map(WebSocketMessage::getPayloadAsText)
                .flatMap(raw -> handleIncomingPacket(userId, sessionId, raw), 64)
                .onErrorResume(ex -> {
                    log.error("Inbound stream failed for session={} userId={}", sessionId, userId, ex);
                    return Mono.empty();
                })
                .then();

        Mono<Void> registerPresence = presenceRedisService.saveUserInstance(userId)
                .onErrorResume(ex -> {
                    log.error("Redis presence registration failed userId={} sessionId={}", userId, sessionId, ex);
                    return Mono.empty();
                });

        return registerPresence.then(Mono.when(outbound, inbound))
                .doFinally(signal -> {
                    packetSender.unregister(sessionId);
                    if (!packetSender.hasLocalUser(userId)) {
                        Mono.when(
                                        presenceRedisService.deleteUserInstance(userId),
                                        presenceRedisService.deleteUserActiveContext(userId))
                                .onErrorResume(ex -> {
                                    log.error("Redis cleanup failed userId={} sessionId={}", userId, sessionId, ex);
                                    return Mono.empty();
                                })
                                .subscribe();
                    }
                    log.info("Connection closed: sessionId={} userId={} signal={}", sessionId, userId, signal);
                });
    }

    private Mono<Void> handleIncomingPacket(String userId, String sessionId, String raw) {
        return Mono.fromCallable(() -> objectMapper.readValue(raw, WsPacket.class))
                .subscribeOn(Schedulers.parallel())
                .doOnNext(packet -> log.debug("Received packet from sessionId={} userId={} type={}",
                        sessionId,
                        userId,
                        packet.getType()))
                .flatMap(packet -> actionService.handleInboundPacket(userId, packet))
                .onErrorResume(ex -> {
                    log.warn("Invalid packet format from sessionId={} userId={} payload={}", sessionId, userId, raw);
                    return actionService.sendError(userId, "Packet JSON invalid");
                });
    }

    private String resolveUserId(WebSocketSession session) {
        URI uri = session.getHandshakeInfo().getUri();
        MultiValueMap<String, String> queryParams = UriComponentsBuilder.fromUri(uri).build().getQueryParams();

        String fromQuery = queryParams.getFirst("userId");
        if (fromQuery != null && !fromQuery.isBlank()) {
            return fromQuery;
        }

        String fromHeader = session.getHandshakeInfo().getHeaders().getFirst("X-User-Id");
        if (fromHeader != null && !fromHeader.isBlank()) {
            return fromHeader;
        }
        return null;
    }
}
