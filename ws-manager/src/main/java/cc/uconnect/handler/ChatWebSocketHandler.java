package cc.uconnect.handler;

import cc.uconnect.model.WsPacket;
import cc.uconnect.service.WsActionService;
import cc.uconnect.service.WsInstanceIdentityService;
import cc.uconnect.service.WsPresenceRedisService;
import cc.uconnect.service.WsPresenceSubscriptionService;
import cc.uconnect.service.WsSessionPacketSender;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.beans.factory.annotation.Value;
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

import java.nio.charset.StandardCharsets;
import java.net.URI;
import java.security.MessageDigest;
import java.security.Principal;
import java.util.concurrent.ArrayBlockingQueue;

@Component
@Log4j2
@RequiredArgsConstructor
public class ChatWebSocketHandler implements WebSocketHandler {

    private static final int OUTBOUND_BUFFER_SIZE = 1024;
    private static final String RELAY_SECRET_HEADER = "X-Uconnect-Relay-Secret";

    private final ObjectMapper objectMapper;
    private final WsSessionPacketSender packetSender;
    private final WsActionService actionService;
    private final WsInstanceIdentityService instanceIdentityService;
    private final WsPresenceRedisService presenceRedisService;
    private final WsPresenceSubscriptionService presenceSubscriptionService;

    @Value("${WS_RELAY_SHARED_SECRET:}")
    private String relaySharedSecret;

    @Value("${SESSION_SECRET:}")
    private String sessionSecret;

    @Override
    public Mono<Void> handle(WebSocketSession session) {
        String sessionId = session.getId();
        return session.getHandshakeInfo().getPrincipal()
                .flatMap(principal -> {
                    String userId = resolveAuthenticatedUserId(principal);
                    if (userId == null) {
                        log.warn("WebSocket rejected: authenticated userId is missing. sessionId={}", sessionId);
                        return session.close(CloseStatus.POLICY_VIOLATION);
                    }
                    if (!isRequestedUserConsistent(session, userId)) {
                        log.warn("WebSocket rejected: requested userId does not match authenticated subject. sessionId={} authenticatedUserId={} requestedUserId={}",
                                sessionId,
                                userId,
                                resolveRequestedUserId(session));
                        return session.close(CloseStatus.POLICY_VIOLATION);
                    }
                    return handleAuthenticatedSession(session, sessionId, userId);
                })
                .switchIfEmpty(Mono.defer(() -> {
                    String trustedRelayUserId = resolveTrustedRelayUserId(session);
                    if (trustedRelayUserId != null) {
                        return handleAuthenticatedSession(session, sessionId, trustedRelayUserId);
                    }
                    log.warn("WebSocket rejected: unauthenticated connection. sessionId={}", sessionId);
                    return session.close(CloseStatus.POLICY_VIOLATION);
                }));
    }

    private Mono<Void> handleAuthenticatedSession(WebSocketSession session, String sessionId, String userId) {
        String localInstanceId = instanceIdentityService.getInstanceId();
        log.info("New WebSocket connection: sessionId={} userId={} localInstanceId={}", sessionId, userId, localInstanceId);

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
                .then(presenceSubscriptionService.notifySubscribers(userId, true))
                .onErrorResume(ex -> {
                    log.error("Redis presence registration failed userId={} sessionId={}", userId, sessionId, ex);
                    return Mono.empty();
                });

        return registerPresence.then(Mono.when(outbound, inbound))
                .doFinally(signal -> {
                    packetSender.unregister(sessionId);
                    if (!packetSender.hasLocalUser(userId)) {
                        Mono.when(
                                        presenceRedisService.deleteUserInstance(userId)
                                                .then(presenceSubscriptionService.notifySubscribers(userId, false)),
                                        presenceRedisService.deleteUserActiveContext(userId),
                                        presenceSubscriptionService.clearSubscriptions(userId))
                                .onErrorResume(ex -> {
                                    log.error("Redis cleanup failed userId={} sessionId={}", userId, sessionId, ex);
                                    return Mono.empty();
                                })
                                .subscribe();
                    }
                    log.info("Connection closed: sessionId={} userId={} signal={} localInstanceId={}", sessionId, userId, signal, localInstanceId);
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

    private String resolveRequestedUserId(WebSocketSession session) {
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

    private String resolveAuthenticatedUserId(Principal principal) {
        if (principal instanceof JwtAuthenticationToken jwtAuthenticationToken) {
            Jwt token = jwtAuthenticationToken.getToken();
            if (token != null && token.getSubject() != null && !token.getSubject().isBlank()) {
                return token.getSubject();
            }
        }

        if (principal instanceof Authentication authentication) {
            String name = authentication.getName();
            if (name != null && !name.isBlank()) {
                return name;
            }
        }

        if (principal != null && principal.getName() != null && !principal.getName().isBlank()) {
            return principal.getName();
        }

        return null;
    }

    private boolean isRequestedUserConsistent(WebSocketSession session, String authenticatedUserId) {
        String requestedUserId = resolveRequestedUserId(session);
        if (requestedUserId == null || requestedUserId.isBlank()) {
            return true;
        }
        return authenticatedUserId.equals(requestedUserId);
    }

    private String resolveTrustedRelayUserId(WebSocketSession session) {
        String configuredSecret = firstNonBlank(relaySharedSecret, sessionSecret);
        if (configuredSecret == null || configuredSecret.isBlank()) {
            return null;
        }

        String providedSecret = session.getHandshakeInfo().getHeaders().getFirst(RELAY_SECRET_HEADER);
        if (!secretsMatch(configuredSecret, providedSecret)) {
            return null;
        }

        String requestedUserId = resolveRequestedUserId(session);
        return requestedUserId != null && !requestedUserId.isBlank() ? requestedUserId : null;
    }

    private boolean secretsMatch(String expected, String provided) {
        if (provided == null || provided.isBlank()) {
            return false;
        }

        byte[] expectedBytes = expected.getBytes(StandardCharsets.UTF_8);
        byte[] providedBytes = provided.getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(expectedBytes, providedBytes);
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }
}
