package cc.uconnect.service;

import cc.uconnect.model.Conversation;
import cc.uconnect.model.MessageType;
import cc.uconnect.repository.ConversationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class ConversationService {

    private final ConversationRepository conversationRepository;

    public List<Conversation> getMyConversations(String userId) {
        log.debug("Get conversations userId={}", userId);
        return conversationRepository.findByParticipantsContaining(userId);
    }

    public Conversation getOrCreatePeerConversation(String userA, String userB) {
        String conversationId = buildPeerConversationId(userA, userB);
        return conversationRepository.findById(conversationId).orElseGet(() -> {
            log.info("Peer conversation created conversationId={}", conversationId);
            Conversation conv = new Conversation();
            conv.setId(conversationId);
            conv.setType(MessageType.PEER);
            List<String> participants = List.of(userA, userB);
            conv.setParticipants(participants);
            conv.setUnreadCounts(new HashMap<>(Map.of(userA, 0, userB, 0)));
            conv.setCreatedAt(Instant.now());
            conv.setUpdatedAt(Instant.now());
            return conversationRepository.save(conv);
        });
    }

    public Conversation getOrCreateGroupConversation(String groupId, String senderId) {
        String conversationId = "group:" + groupId;
        return conversationRepository.findById(conversationId).orElseGet(() -> {
            log.info("Group conversation created conversationId={}", conversationId);
            Conversation conv = new Conversation();
            conv.setId(conversationId);
            conv.setType(MessageType.GROUP);
            conv.setParticipants(new ArrayList<>(List.of(senderId)));
            conv.setUnreadCounts(new HashMap<>(Map.of(senderId, 0)));
            conv.setCreatedAt(Instant.now());
            conv.setUpdatedAt(Instant.now());
            return conversationRepository.save(conv);
        });
    }

    // Called by Kafka flow - creates or enriches a conversation with known participants.
    public Conversation getOrCreateConversationForKafka(String conversationId, MessageType type, List<String> participants) {
        List<String> normalizedParticipants = normalizeParticipants(participants);
        return conversationRepository.findById(conversationId)
                .map(existing -> {
                    boolean changed = false;

                    if (existing.getType() == null) {
                        existing.setType(type);
                        changed = true;
                    }

                    if (existing.getParticipants() == null) {
                        existing.setParticipants(new ArrayList<>());
                        changed = true;
                    }

                    Set<String> mergedParticipants = new LinkedHashSet<>(existing.getParticipants());
                    mergedParticipants.addAll(normalizedParticipants);
                    List<String> updatedParticipants = new ArrayList<>(mergedParticipants);
                    if (!updatedParticipants.equals(existing.getParticipants())) {
                        existing.setParticipants(updatedParticipants);
                        changed = true;
                    }

                    if (existing.getUnreadCounts() == null) {
                        existing.setUnreadCounts(new HashMap<>());
                        changed = true;
                    }
                    for (String participant : updatedParticipants) {
                        if (existing.getUnreadCounts().putIfAbsent(participant, 0) == null) {
                            changed = true;
                        }
                    }

                    if (changed) {
                        existing.setUpdatedAt(Instant.now());
                        return conversationRepository.save(existing);
                    }
                    return existing;
                })
                .orElseGet(() -> {
                    log.info("Conversation created from Kafka flow conversationId={} type={}", conversationId, type);
                    Conversation conv = new Conversation();
                    conv.setId(conversationId);
                    conv.setType(type);
                    conv.setParticipants(new ArrayList<>(normalizedParticipants));
                    conv.setUnreadCounts(new HashMap<>());
                    for (String participant : normalizedParticipants) {
                        conv.getUnreadCounts().put(participant, 0);
                    }
                    conv.setCreatedAt(Instant.now());
                    conv.setUpdatedAt(Instant.now());
                    return conversationRepository.save(conv);
                });
    }

    public void updateLastMessage(String conversationId, Conversation.LastMessage lastMessage, String senderId) {
        conversationRepository.findById(conversationId).ifPresent(conv -> {
            conv.setLastMessage(lastMessage);
            conv.setUpdatedAt(Instant.now());

            List<String> participants = conv.getParticipants() != null ? conv.getParticipants() : new ArrayList<>();
            if (conv.getUnreadCounts() == null) {
                conv.setUnreadCounts(new HashMap<>());
            }
            for (String participant : participants) {
                conv.getUnreadCounts().putIfAbsent(participant, 0);
            }

            participants.stream()
                    .filter(participant -> !participant.equals(senderId))
                    .forEach(participant -> conv.getUnreadCounts().merge(participant, 1, Integer::sum));

            conversationRepository.save(conv);
            log.debug("Last message updated conversationId={} messageId={}", conversationId, lastMessage.getId());
        });
    }

    public void markRead(String conversationId, String userId) {
        conversationRepository.findById(conversationId).ifPresent(conv -> {
            if (conv.getUnreadCounts() == null) {
                conv.setUnreadCounts(new HashMap<>());
            }
            conv.getUnreadCounts().put(userId, 0);
            conversationRepository.save(conv);
            log.debug("Conversation marked read conversationId={} userId={}", conversationId, userId);
        });
    }

    // Legacy helper kept for compatibility with older code paths.
    public void getOrCreateConversationById(String conversationId, String senderId, String targetId) {
        MessageType type = conversationId.startsWith("peer:") ? MessageType.PEER : MessageType.GROUP;
        List<String> participants = new ArrayList<>();
        if (senderId != null && !senderId.isBlank()) {
            participants.add(senderId);
        }
        if (targetId != null && !targetId.isBlank()) {
            participants.add(targetId);
        }
        getOrCreateConversationForKafka(conversationId, type, participants);
    }

    public static String buildPeerConversationId(String userA, String userB) {
        String min = userA.compareTo(userB) <= 0 ? userA : userB;
        String max = userA.compareTo(userB) <= 0 ? userB : userA;
        return "peer:" + min + "_" + max;
    }

    private List<String> normalizeParticipants(List<String> participants) {
        if (participants == null || participants.isEmpty()) {
            return new ArrayList<>();
        }
        Set<String> normalized = new LinkedHashSet<>();
        for (String participant : participants) {
            if (participant != null && !participant.isBlank()) {
                normalized.add(participant);
            }
        }
        return new ArrayList<>(normalized);
    }
}
