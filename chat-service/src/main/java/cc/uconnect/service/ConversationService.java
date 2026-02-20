package cc.uconnect.service;

import cc.uconnect.model.Conversation;
import cc.uconnect.model.MessageType;
import cc.uconnect.repository.ConversationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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
            conv.setParticipants(List.of(userA, userB));
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
            conv.setParticipants(List.of(senderId));
            conv.setUnreadCounts(new HashMap<>());
            conv.setCreatedAt(Instant.now());
            conv.setUpdatedAt(Instant.now());
            return conversationRepository.save(conv);
        });
    }

    public void updateLastMessage(String conversationId, Conversation.LastMessage lastMessage, String senderId) {
        conversationRepository.findById(conversationId).ifPresent(conv -> {
            conv.setLastMessage(lastMessage);
            conv.setUpdatedAt(Instant.now());
            if (conv.getUnreadCounts() != null) {
                conv.getParticipants().stream()
                        .filter(p -> !p.equals(senderId))
                        .forEach(p -> conv.getUnreadCounts().merge(p, 1, Integer::sum));
            }
            conversationRepository.save(conv);
            log.debug("Last message updated conversationId={} messageId={}", conversationId, lastMessage.getId());
        });
    }

    public void markRead(String conversationId, String userId) {
        conversationRepository.findById(conversationId).ifPresent(conv -> {
            if (conv.getUnreadCounts() != null) {
                conv.getUnreadCounts().put(userId, 0);
            }
            conversationRepository.save(conv);
            log.debug("Conversation marked read conversationId={} userId={}", conversationId, userId);
        });
    }

    // Appelé depuis Kafka — crée la conversation si elle n'existe pas encore
    public void getOrCreateConversationById(String conversationId, String senderId, String targetId) {
        if (conversationRepository.existsById(conversationId)) {
            return;
        }
        log.info("Conversation created from Kafka flow conversationId={}", conversationId);
        Conversation conv = new Conversation();
        conv.setId(conversationId);
        conv.setCreatedAt(Instant.now());
        conv.setUpdatedAt(Instant.now());
        if (conversationId.startsWith("peer:")) {
            conv.setType(MessageType.PEER);
            conv.setParticipants(List.of(senderId, targetId));
            conv.setUnreadCounts(new HashMap<>(Map.of(senderId, 0, targetId, 0)));
        } else {
            conv.setType(MessageType.GROUP);
            conv.setParticipants(List.of(senderId));
            conv.setUnreadCounts(new HashMap<>());
        }
        conversationRepository.save(conv);
    }

    public static String buildPeerConversationId(String userA, String userB) {
        String min = userA.compareTo(userB) <= 0 ? userA : userB;
        String max = userA.compareTo(userB) <= 0 ? userB : userA;
        return "peer:" + min + "_" + max;
    }
}
