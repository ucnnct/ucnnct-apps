package cc.uconnect.service;

import cc.uconnect.enums.MessageType;
import cc.uconnect.enums.NotificationDecisionType;
import cc.uconnect.model.Message;
import cc.uconnect.model.PresenceSnapshot;
import cc.uconnect.model.UserActiveContext;
import org.springframework.stereotype.Service;

@Service
public class NotificationDecisionService {

    public NotificationDecisionType decide(Message message, PresenceSnapshot snapshot) {
        if (snapshot == null || !snapshot.isOnline()) {
            return NotificationDecisionType.EMAIL;
        }
        if (isViewingConversation(message, snapshot.getActiveContext())) {
            return NotificationDecisionType.SKIP;
        }
        return NotificationDecisionType.IN_APP;
    }

    public String resolveConversationReference(Message message) {
        if (message != null && message.getType() == MessageType.GROUP
                && message.getGroupId() != null
                && !message.getGroupId().isBlank()) {
            return message.getGroupId();
        }
        return message == null ? null : message.getSenderId();
    }

    private boolean isViewingConversation(Message message, UserActiveContext context) {
        if (context == null || context.getPage() == null) {
            return false;
        }
        if (!"CONVERSATION".equalsIgnoreCase(context.getPage())) {
            return false;
        }
        String expectedConversation = resolveConversationReference(message);
        if (expectedConversation == null || expectedConversation.isBlank()) {
            return false;
        }
        return expectedConversation.equals(context.getConversationId());
    }
}
