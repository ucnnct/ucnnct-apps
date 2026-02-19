package cc.uconnect.enums;

import cc.uconnect.model.Message;

import java.util.Optional;

public enum NotificationEventType {
    PRIVATE_MESSAGE,
    GROUP_MESSAGE;

    public static Optional<NotificationEventType> fromMessage(Message message) {
        if (message == null || message.getType() == null) {
            return Optional.empty();
        }
        if (message.getType() == MessageType.GROUP) {
            return Optional.of(GROUP_MESSAGE);
        }
        if (message.getType() == MessageType.PRIVATE) {
            return Optional.of(PRIVATE_MESSAGE);
        }
        return Optional.empty();
    }
}
