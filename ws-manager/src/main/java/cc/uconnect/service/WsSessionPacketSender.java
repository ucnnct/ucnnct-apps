package cc.uconnect.service;

import cc.uconnect.model.WsPacket;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Sinks;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Log4j2
@RequiredArgsConstructor
public class WsSessionPacketSender {

    
    private final ObjectMapper objectMapper;
    private final Map<String, Sinks.Many<String>> sessionSinks = new ConcurrentHashMap<>();
    private final Map<String, Set<String>> userSessions = new ConcurrentHashMap<>();
    private final Map<String, String> sessionUsers = new ConcurrentHashMap<>();

    public void register(String userId, String sessionId, Sinks.Many<String> sink) {
        Sinks.Many<String> previous = sessionSinks.put(sessionId, sink);
        if (previous != null) {
            previous.tryEmitComplete();
        }

        sessionUsers.put(sessionId, userId);
        userSessions.computeIfAbsent(userId, ignored -> ConcurrentHashMap.newKeySet()).add(sessionId);
    }

    public void unregister(String sessionId) {
        Sinks.Many<String> sink = sessionSinks.remove(sessionId);
        if (sink != null) {
            sink.tryEmitComplete();
        }

        String userId = sessionUsers.remove(sessionId);
        if (userId == null) {
            return;
        }
        Set<String> sessions = userSessions.get(userId);
        if (sessions == null) {
            return;
        }
        sessions.remove(sessionId);
        if (sessions.isEmpty()) {
            userSessions.remove(userId);
        }
    }

    public boolean sendPacketToUser(String userId, WsPacket packet) {
        Set<String> sessions = userSessions.get(userId);
        if (sessions == null || sessions.isEmpty()) {
            log.debug("Cannot send packet. User is not connected userId={}", userId);
            return false;
        }

        try {
            String payload = objectMapper.writeValueAsString(packet);
            boolean sentAtLeastOnce = false;
            for (String sessionId : List.copyOf(sessions)) {
                Sinks.Many<String> sink = sessionSinks.get(sessionId);
                if (sink == null) {
                    continue;
                }

                Sinks.EmitResult result = sink.tryEmitNext(payload);
                if (result == Sinks.EmitResult.OK) {
                    sentAtLeastOnce = true;
                    continue;
                }

                log.warn("Packet emit failed userId={} sessionId={} result={} type={}",
                        userId,
                        sessionId,
                        result,
                        packet.getType());
            }
            return sentAtLeastOnce;
        } catch (Exception ex) {
            log.error("Packet serialization failed userId={} type={}",
                    userId,
                    packet.getType(),
                    ex);
            return false;
        }
    }

    public boolean hasLocalUser(String userId) {
        Set<String> sessions = userSessions.get(userId);
        return sessions != null && !sessions.isEmpty();
    }
}
