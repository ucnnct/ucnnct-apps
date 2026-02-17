package cc.uconnect.kafka.consumer;

import cc.uconnect.kafka.event.MessagePersistedEvent;
import cc.uconnect.kafka.event.MessageReadConfirmedEvent;
import cc.uconnect.kafka.event.MessageReadEvent;
import cc.uconnect.kafka.event.SendMessageEvent;
import cc.uconnect.kafka.producer.ChatKafkaProducer;
import cc.uconnect.model.Message;
import cc.uconnect.service.MessageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class ChatKafkaConsumer {

    private final MessageService messageService;
    private final ChatKafkaProducer producer;

    @KafkaListener(topics = "message.send", groupId = "chat-service",
                   containerFactory = "kafkaListenerContainerFactory")
    public void onMessageSend(SendMessageEvent event) {
        log.debug("Received message.send conversationId={} senderId={}", event.getConversationId(), event.getSenderId());
        try {
            Message saved = messageService.persistFromKafka(event);
            log.debug("Message persisted messageId={} conversationId={}", saved.getId(), saved.getConversationId());

            MessagePersistedEvent persisted = new MessagePersistedEvent(
                    saved.getId(),
                    saved.getSenderId(),
                    saved.getTargetId(),
                    saved.getConversationId(),
                    saved.getCreatedAt().toEpochMilli()
            );
            producer.publishMessagePersisted(persisted);
        } catch (Exception e) {
            log.error("Failed to persist message senderId={} conversationId={}", event.getSenderId(), event.getConversationId(), e);
        }
    }

    @KafkaListener(topics = "message.read", groupId = "chat-service",
                   containerFactory = "kafkaListenerContainerFactory")
    public void onMessageRead(MessageReadEvent event) {
        log.debug("Received message.read messageId={} readerId={}", event.getMessageId(), event.getReaderId());
        try {
            Message updated = messageService.markReadFromKafka(event.getMessageId(), event.getReaderId());

            MessageReadConfirmedEvent confirmed = new MessageReadConfirmedEvent(
                    updated.getId(),
                    event.getReaderId(),
                    updated.getSenderId()
            );
            producer.publishMessageReadConfirmed(confirmed);
            log.debug("Read confirmed messageId={} senderId={}", updated.getId(), updated.getSenderId());
        } catch (org.springframework.web.server.ResponseStatusException e) {
            log.warn("Cannot mark message as read messageId={} readerId={}: {}", event.getMessageId(), event.getReaderId(), e.getReason());
        } catch (Exception e) {
            log.error("Failed to mark message read messageId={} readerId={}", event.getMessageId(), event.getReaderId(), e);
        }
    }
}
