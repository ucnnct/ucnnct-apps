package cc.uconnect.service;

import cc.uconnect.enums.MessageType;
import cc.uconnect.model.Message;
import cc.uconnect.model.Notification;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class NotificationContentService {

    public Notification buildInAppNotification(String targetUserId, Message message, String conversationReference) {
        return Notification.builder()
                .notificationId(UUID.randomUUID().toString())
                .targetUserId(targetUserId)
                .category(resolveCategory(message))
                .content(buildContentPreview(message))
                .referenceId(conversationReference)
                .build();
    }

    public String buildEmailSubject(String subjectPrefix, Message message) {
        String base = message != null && message.getType() == MessageType.GROUP
                ? "Nouveau message de groupe"
                : "Nouveau message";
        return (subjectPrefix + " " + base).trim();
    }

    public String buildEmailBody(Message message, String conversationReference) {
        String typeLabel = message != null && message.getType() == MessageType.GROUP ? "groupe" : "conversation";
        String content = buildContentPreview(message);
        return """
                Vous avez recu un nouveau message.

                Apercu: %s
                Type: %s
                Reference conversation: %s
                MessageId: %s
                """
                .formatted(
                        content,
                        typeLabel,
                        conversationReference == null ? "-" : conversationReference,
                        message == null ? "-" : safe(message.getMessageId()));
    }

    private String resolveCategory(Message message) {
        if (message != null && message.getType() == MessageType.GROUP) {
            return "GROUP_MESSAGE";
        }
        return "PRIVATE_MESSAGE";
    }

    private String buildContentPreview(Message message) {
        if (message == null || message.getContent() == null || message.getContent().isBlank()) {
            return "Nouveau message";
        }
        String content = message.getContent().trim();
        if (content.length() <= 180) {
            return content;
        }
        return content.substring(0, 177) + "...";
    }

    private String safe(String value) {
        return value == null ? "-" : value;
    }
}
