package cc.uconnect.service;

import cc.uconnect.dto.SendMessageRequest;
import cc.uconnect.kafka.event.MessageStatusUpdateEvent;
import cc.uconnect.kafka.event.SendMessageEvent;
import cc.uconnect.model.Conversation;
import cc.uconnect.model.Message;
import cc.uconnect.model.MessageFormat;
import cc.uconnect.model.MessageStatus;
import cc.uconnect.model.MessageType;
import cc.uconnect.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class MessageService {

    private static final String STATUS_SENT = "SENT";
    private static final String STATUS_READ = "READ";
    private static final String STATUS_RECEIVED = "RECEIVED";
    private static final String STATUS_DELIVERED = "DELIVERED";

    private final MessageRepository messageRepository;
    private final ConversationService conversationService;
    private final UserDirectoryCacheService userDirectoryCacheService;

    public Message sendMessage(SendMessageRequest req, String senderId) {
        String conversationId;
        String groupId = null;
        List<String> receiversId = new ArrayList<>();

        if (req.getType() == MessageType.PEER) {
            Conversation conv = conversationService.getOrCreatePeerConversation(senderId, req.getTargetId());
            conversationId = conv.getId();
            receiversId = List.of(req.getTargetId());
        } else if (req.getType() == MessageType.GROUP) {
            Conversation conv = conversationService.getOrCreateGroupConversation(req.getTargetId(), senderId);
            conversationId = conv.getId();
            groupId = req.getTargetId();
        } else {
            log.warn("Invalid message type='{}' senderId={}", req.getType(), senderId);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid message type. Must be PEER or GROUP.");
        }

        Message message = new Message();
        message.setConversationId(conversationId);
        message.setType(req.getType());
        message.setSenderId(senderId);
        message.setGroupId(groupId);
        message.setReceiversId(receiversId);
        message.setTargetId(req.getTargetId());
        message.setContent(req.getContent());
        message.setObjectKey(null);
        message.setFormat(req.getFormat() != null ? req.getFormat() : MessageFormat.TEXT);
        message.setAttachments(req.getAttachments() != null ? req.getAttachments() : new ArrayList<>());
        message.setStatus(MessageStatus.SENT);
        message.setReadBy(new ArrayList<>());
        message.setHiddenFor(new ArrayList<>());
        message.setReplyTo(req.getReplyTo());
        message.setEdited(false);
        message.setDeleted(false);
        message.setCreatedAt(Instant.now());
        message.setUpdatedAt(Instant.now());

        message = messageRepository.save(message);
        refreshDirectoryUserCache(message);
        log.debug("Message sent (REST) messageId={} conversationId={} senderId={}",
                message.getId(),
                conversationId,
                senderId);

        Conversation.LastMessage lastMsg = new Conversation.LastMessage();
        lastMsg.setId(message.getId());
        lastMsg.setSenderId(senderId);
        lastMsg.setContent(req.getContent());
        lastMsg.setCreatedAt(message.getCreatedAt());
        conversationService.updateLastMessage(conversationId, lastMsg, senderId);

        return message;
    }

    public Page<Message> getMessages(String conversationId, int page, int size) {
        log.debug("Get messages conversationId={} page={} size={}", conversationId, page, size);
        return messageRepository.findByConversationIdOrderByCreatedAtDesc(
                conversationId, PageRequest.of(page, size));
    }

    public Message editMessage(String messageId, String newContent, String currentUserId) {
        Message message = findMessageOrThrow(messageId);

        if (!message.getSenderId().equals(currentUserId)) {
            log.warn("Edit rejected - not the sender messageId={} userId={}", messageId, currentUserId);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the sender can edit this message");
        }
        if (message.isDeleted()) {
            log.warn("Edit rejected - message already deleted messageId={}", messageId);
            throw new ResponseStatusException(HttpStatus.GONE, "Message has been deleted");
        }

        message.setContent(newContent);
        message.setEdited(true);
        message.setUpdatedAt(Instant.now());
        Message saved = messageRepository.save(message);
        log.info("Message edited messageId={} by senderId={}", messageId, currentUserId);
        return saved;
    }

    public Message softDeleteMessage(String messageId, String currentUserId) {
        Message message = findMessageOrThrow(messageId);

        if (!message.getSenderId().equals(currentUserId)) {
            log.warn("Delete rejected - not the sender messageId={} userId={}", messageId, currentUserId);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the sender can delete this message");
        }

        message.setDeleted(true);
        message.setContent(null);
        message.setUpdatedAt(Instant.now());
        Message saved = messageRepository.save(message);
        log.info("Message soft-deleted messageId={} by senderId={}", messageId, currentUserId);
        return saved;
    }

    // Called from Kafka - payload produced by ws-manager.
    public Message persistFromKafka(SendMessageEvent event) {
        if (event == null || event.getSenderId() == null || event.getSenderId().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "senderId is required");
        }

        KafkaMessageContext context = resolveKafkaContext(event);
        conversationService.getOrCreateConversationForKafka(
                context.conversationId(),
                context.messageType(),
                context.participants());

        Message message = new Message();
        if (event.getMessageId() != null && !event.getMessageId().isBlank()) {
            message.setId(event.getMessageId());
        }
        message.setConversationId(context.conversationId());
        message.setType(context.messageType());
        message.setSenderId(event.getSenderId());
        message.setGroupId(context.groupId());
        message.setReceiversId(context.receiversId());
        message.setTargetId(context.targetId());
        message.setContent(event.getContent());
        message.setObjectKey(event.getObjectKey());
        message.setFormat(resolveFormat(event.getFormat()));
        message.setAttachments(resolveAttachments(event.getObjectKey()));
        message.setStatus(resolveMessageStatus(event.getStatus()));
        message.setReadBy(new ArrayList<>());
        message.setHiddenFor(new ArrayList<>());
        message.setEdited(false);
        message.setDeleted(false);
        message.setCreatedAt(Instant.now());
        message.setUpdatedAt(Instant.now());

        message = messageRepository.save(message);
        refreshDirectoryUserCache(message);

        Conversation.LastMessage lastMsg = new Conversation.LastMessage();
        lastMsg.setId(message.getId());
        lastMsg.setSenderId(event.getSenderId());
        lastMsg.setContent(resolveLastMessageContent(message));
        lastMsg.setCreatedAt(message.getCreatedAt());
        conversationService.updateLastMessage(context.conversationId(), lastMsg, event.getSenderId());

        return message;
    }

    public Message updateStatusFromKafka(MessageStatusUpdateEvent event) {
        if (event == null || event.getMessageId() == null || event.getMessageId().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "messageId is required");
        }

        Message message = findMessageOrThrow(event.getMessageId());
        String normalizedStatus = normalizeStatus(event.getStatus(), event.getReaderId());
        String actorUserId = resolveStatusActorUserId(event);

        if (STATUS_READ.equals(normalizedStatus) && actorUserId != null && !actorUserId.isBlank()) {
            if (message.getReadBy() == null) {
                message.setReadBy(new ArrayList<>());
            }
            if (!message.getReadBy().contains(actorUserId)) {
                message.getReadBy().add(actorUserId);
            }
        }

        message.setStatus(mapStatusForStorage(normalizedStatus));
        message.setUpdatedAt(Instant.now());

        Message saved = messageRepository.save(message);
        log.debug("Message status updated messageId={} status={} actorUserId={}",
                saved.getId(),
                saved.getStatus(),
                actorUserId);
        return saved;
    }

    // Backward-compat helper used by legacy flow.
    public Message markReadFromKafka(String messageId, String readerId) {
        MessageStatusUpdateEvent event = MessageStatusUpdateEvent.builder()
                .messageId(messageId)
                .readerId(readerId)
                .status(STATUS_READ)
                .build();
        return updateStatusFromKafka(event);
    }

    private KafkaMessageContext resolveKafkaContext(SendMessageEvent event) {
        if (event.getConversationId() != null && !event.getConversationId().isBlank()) {
            return resolveLegacyKafkaContext(event);
        }

        String senderId = event.getSenderId();
        if (isGroupMessage(event)) {
            String groupId = requireNonBlank(event.getGroupId(), "groupId is required for GROUP message");
            String conversationId = "group:" + groupId;
            List<String> receiversId = normalizeUserIds(event.getReceiversId());
            if (receiversId.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "receiversId is required for GROUP message");
            }
            List<String> participants = mergeParticipants(senderId, receiversId);
            return new KafkaMessageContext(
                    conversationId,
                    MessageType.GROUP,
                    groupId,
                    receiversId,
                    groupId,
                    participants
            );
        }

        String receiverId = resolvePrivateReceiverId(event);
        String conversationId = ConversationService.buildPeerConversationId(senderId, receiverId);
        List<String> participants = mergeParticipants(senderId, List.of(receiverId));
        return new KafkaMessageContext(
                conversationId,
                MessageType.PEER,
                null,
                List.of(receiverId),
                receiverId,
                participants
        );
    }

    private KafkaMessageContext resolveLegacyKafkaContext(SendMessageEvent event) {
        String conversationId = event.getConversationId();
        MessageType messageType = conversationId.startsWith("group:") ? MessageType.GROUP : MessageType.PEER;

        String senderId = event.getSenderId();
        String groupId = event.getGroupId();
        List<String> receiversId = normalizeUserIds(event.getReceiversId());
        String targetId = event.getTargetId();

        if (messageType == MessageType.GROUP) {
            if ((groupId == null || groupId.isBlank()) && conversationId.startsWith("group:")) {
                groupId = conversationId.substring("group:".length());
            }
            if ((targetId == null || targetId.isBlank()) && groupId != null && !groupId.isBlank()) {
                targetId = groupId;
            }
            List<String> participants = mergeParticipants(senderId, receiversId);
            return new KafkaMessageContext(conversationId, MessageType.GROUP, groupId, receiversId, targetId, participants);
        }

        String receiverId = targetId;
        if ((receiverId == null || receiverId.isBlank()) && !receiversId.isEmpty()) {
            receiverId = receiversId.get(0);
        }
        receiverId = requireNonBlank(receiverId, "target receiver is required for PRIVATE message");
        List<String> participants = mergeParticipants(senderId, List.of(receiverId));
        return new KafkaMessageContext(conversationId, MessageType.PEER, null, List.of(receiverId), receiverId, participants);
    }

    private boolean isGroupMessage(SendMessageEvent event) {
        if (event.getType() == null) {
            return event.getGroupId() != null && !event.getGroupId().isBlank();
        }
        return "GROUP".equalsIgnoreCase(event.getType());
    }

    private String resolvePrivateReceiverId(SendMessageEvent event) {
        List<String> receiversId = normalizeUserIds(event.getReceiversId());
        if (!receiversId.isEmpty()) {
            return receiversId.get(0);
        }
        return requireNonBlank(event.getTargetId(), "receiversId is required for PRIVATE message");
    }

    private List<String> normalizeUserIds(List<String> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return new ArrayList<>();
        }
        Set<String> normalized = new LinkedHashSet<>();
        for (String userId : userIds) {
            if (userId != null && !userId.isBlank()) {
                normalized.add(userId);
            }
        }
        return new ArrayList<>(normalized);
    }

    private List<String> mergeParticipants(String senderId, List<String> otherUserIds) {
        Set<String> participants = new LinkedHashSet<>();
        if (senderId != null && !senderId.isBlank()) {
            participants.add(senderId);
        }
        participants.addAll(normalizeUserIds(otherUserIds));
        return new ArrayList<>(participants);
    }

    private String requireNonBlank(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
        return value;
    }

    private MessageFormat resolveFormat(String rawFormat) {
        if (rawFormat == null || rawFormat.isBlank()) {
            return MessageFormat.TEXT;
        }
        try {
            return MessageFormat.valueOf(rawFormat.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            return MessageFormat.TEXT;
        }
    }

    private List<String> resolveAttachments(String objectKey) {
        if (objectKey == null || objectKey.isBlank()) {
            return new ArrayList<>();
        }
        return new ArrayList<>(List.of(objectKey));
    }

    private MessageStatus resolveMessageStatus(String rawStatus) {
        String normalizedStatus = normalizeStatus(rawStatus, null);
        return mapStatusForStorage(normalizedStatus);
    }

    private MessageStatus mapStatusForStorage(String normalizedStatus) {
        if (STATUS_READ.equals(normalizedStatus)) {
            return MessageStatus.READ;
        }
        if (STATUS_RECEIVED.equals(normalizedStatus) || STATUS_DELIVERED.equals(normalizedStatus)) {
            return MessageStatus.DELIVERED;
        }
        return MessageStatus.SENT;
    }

    private String normalizeStatus(String status, String legacyReaderId) {
        if (status == null || status.isBlank()) {
            if (legacyReaderId != null && !legacyReaderId.isBlank()) {
                return STATUS_READ;
            }
            return STATUS_SENT;
        }
        return status.trim().toUpperCase(Locale.ROOT);
    }

    private String resolveStatusActorUserId(MessageStatusUpdateEvent event) {
        List<String> receiversId = normalizeUserIds(event.getReceiversId());
        if (!receiversId.isEmpty()) {
            return receiversId.get(0);
        }
        if (event.getReaderId() != null && !event.getReaderId().isBlank()) {
            return event.getReaderId();
        }
        return null;
    }

    private String resolveLastMessageContent(Message message) {
        if (message.getContent() != null && !message.getContent().isBlank()) {
            return message.getContent();
        }
        if (message.getObjectKey() != null && !message.getObjectKey().isBlank()) {
            return "[FILE]";
        }
        return "";
    }

    private Message findMessageOrThrow(String id) {
        return messageRepository.findById(id)
                .orElseThrow(() -> {
                    log.warn("Message not found messageId={}", id);
                    return new ResponseStatusException(HttpStatus.NOT_FOUND, "Message not found");
                });
    }

    private void refreshDirectoryUserCache(Message message) {
        if (message == null) {
            return;
        }

        List<String> userIds = new ArrayList<>();
        if (message.getSenderId() != null && !message.getSenderId().isBlank()) {
            userIds.add(message.getSenderId());
        }
        if (message.getReceiversId() != null && !message.getReceiversId().isEmpty()) {
            userIds.addAll(message.getReceiversId());
        }
        userDirectoryCacheService.cacheUsersIfAbsent(userIds);
    }

    private record KafkaMessageContext(
            String conversationId,
            MessageType messageType,
            String groupId,
            List<String> receiversId,
            String targetId,
            List<String> participants
    ) {
    }
}
