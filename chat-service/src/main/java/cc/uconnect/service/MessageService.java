package cc.uconnect.service;

import cc.uconnect.dto.SendMessageRequest;
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

@Service
@RequiredArgsConstructor
@Slf4j
public class MessageService {

    private final MessageRepository messageRepository;
    private final ConversationService conversationService;

    public Message sendMessage(SendMessageRequest req, String senderId) {
        String conversationId;

        if (req.getType() == MessageType.PEER) {
            Conversation conv = conversationService.getOrCreatePeerConversation(senderId, req.getTargetId());
            conversationId = conv.getId();
        } else if (req.getType() == MessageType.GROUP) {
            Conversation conv = conversationService.getOrCreateGroupConversation(req.getTargetId(), senderId);
            conversationId = conv.getId();
        } else {
            log.warn("Invalid message type='{}' senderId={}", req.getType(), senderId);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid message type. Must be PEER or GROUP.");
        }

        Message message = new Message();
        message.setConversationId(conversationId);
        message.setType(req.getType());
        message.setSenderId(senderId);
        message.setTargetId(req.getTargetId());
        message.setContent(req.getContent());
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
        log.debug("Message sent (REST) messageId={} conversationId={} senderId={}", message.getId(), conversationId, senderId);

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
            log.warn("Edit rejected — not the sender messageId={} userId={}", messageId, currentUserId);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the sender can edit this message");
        }
        if (message.isDeleted()) {
            log.warn("Edit rejected — message already deleted messageId={}", messageId);
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
            log.warn("Delete rejected — not the sender messageId={} userId={}", messageId, currentUserId);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the sender can delete this message");
        }

        message.setDeleted(true);
        message.setContent(null);
        message.setUpdatedAt(Instant.now());
        Message saved = messageRepository.save(message);
        log.info("Message soft-deleted messageId={} by senderId={}", messageId, currentUserId);
        return saved;
    }

    // Appelé depuis Kafka — le conversationId vient déjà du WSManager
    public Message persistFromKafka(SendMessageEvent event) {
        conversationService.getOrCreateConversationById(event.getConversationId(), event.getSenderId(), event.getTargetId());

        MessageFormat format = event.getFormat() != null
                ? MessageFormat.valueOf(event.getFormat())
                : MessageFormat.TEXT;

        Message message = new Message();
        message.setConversationId(event.getConversationId());
        message.setType(event.getConversationId().startsWith("group:") ? MessageType.GROUP : MessageType.PEER);
        message.setSenderId(event.getSenderId());
        message.setTargetId(event.getTargetId());
        message.setContent(event.getContent());
        message.setFormat(format);
        message.setAttachments(new ArrayList<>());
        message.setStatus(MessageStatus.SENT);
        message.setReadBy(new ArrayList<>());
        message.setHiddenFor(new ArrayList<>());
        message.setEdited(false);
        message.setDeleted(false);
        message.setCreatedAt(Instant.now());
        message.setUpdatedAt(Instant.now());

        message = messageRepository.save(message);

        Conversation.LastMessage lastMsg = new Conversation.LastMessage();
        lastMsg.setId(message.getId());
        lastMsg.setSenderId(event.getSenderId());
        lastMsg.setContent(event.getContent());
        lastMsg.setCreatedAt(message.getCreatedAt());
        conversationService.updateLastMessage(event.getConversationId(), lastMsg, event.getSenderId());

        return message;
    }

    // Appelé depuis Kafka — retourne le message pour que le consumer publie l'événement confirmé
    public Message markReadFromKafka(String messageId, String readerId) {
        Message message = findMessageOrThrow(messageId);

        if (!message.getReadBy().contains(readerId)) {
            message.getReadBy().add(readerId);
        }
        message.setStatus(MessageStatus.READ);
        message.setUpdatedAt(Instant.now());
        return messageRepository.save(message);
    }

    private Message findMessageOrThrow(String id) {
        return messageRepository.findById(id)
                .orElseThrow(() -> {
                    log.warn("Message not found messageId={}", id);
                    return new ResponseStatusException(HttpStatus.NOT_FOUND, "Message not found");
                });
    }
}
