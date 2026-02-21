package cc.uconnect.service;

import cc.uconnect.enums.FriendEventType;
import cc.uconnect.enums.GroupEventType;
import cc.uconnect.enums.MessageType;
import cc.uconnect.enums.NotificationDecisionType;
import cc.uconnect.model.GroupEvent;
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

    public NotificationDecisionType decideFriendEvent(FriendEventType eventType, PresenceSnapshot snapshot) {
        if (snapshot == null || !snapshot.isOnline()) {
            return NotificationDecisionType.EMAIL;
        }

        // Friend lifecycle changes must be reflected immediately for connected users.
        if (eventType == FriendEventType.FRIEND_REQUEST_ACCEPTED
                || eventType == FriendEventType.FRIEND_REQUEST_SENT
                || eventType == FriendEventType.FRIEND_REQUEST_REJECTED
                || eventType == FriendEventType.FRIEND_REMOVED) {
            return NotificationDecisionType.IN_APP;
        }

        if (isViewingFriendRequests(snapshot.getActiveContext())) {
            return NotificationDecisionType.SKIP;
        }
        return NotificationDecisionType.IN_APP;
    }

    public NotificationDecisionType decideGroupEvent(GroupEvent event, PresenceSnapshot snapshot) {
        if (snapshot == null || !snapshot.isOnline()) {
            return NotificationDecisionType.EMAIL;
        }

        GroupEventType eventType = event == null ? null : event.getEventType();
        if (eventType == GroupEventType.MEMBER_ADDED
                && isViewingGroupConversation(snapshot.getActiveContext(), event == null ? null : event.getGroupId())) {
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

    private boolean isViewingFriendRequests(UserActiveContext context) {
        if (context == null || context.getPage() == null) {
            return false;
        }

        String page = context.getPage().trim();
        if (page.isEmpty()) {
            return false;
        }

        return "/friend-requests".equalsIgnoreCase(page);
    }

    private boolean isViewingGroupConversation(UserActiveContext context, String groupId) {
        if (context == null || context.getPage() == null) {
            return false;
        }
        if (!"CONVERSATION".equalsIgnoreCase(context.getPage())) {
            return false;
        }
        if (groupId == null || groupId.isBlank()) {
            return false;
        }
        return groupId.equals(context.getConversationId());
    }
}
