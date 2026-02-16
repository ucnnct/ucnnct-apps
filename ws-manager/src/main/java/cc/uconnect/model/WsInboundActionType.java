package cc.uconnect.model;

import java.util.Arrays;
import java.util.Optional;

public enum WsInboundActionType {
    SEND_PRIVATE_MESSAGE,
    SEND_GROUP_MESSAGE,
    SEND_FILE_MESSAGE,
    MESSAGE_READ,
    GROUP_MESSAGE_READ,
    SEND_NOTIFICATION,
    UPLOAD_COMPLETED,
    REQUEST_FILE_DOWNLOAD;

    public static Optional<WsInboundActionType> from(String rawValue) {
        if (rawValue == null || rawValue.isBlank()) {
            return Optional.empty();
        }
        return Arrays.stream(values())
                .filter(value -> value.name().equalsIgnoreCase(rawValue))
                .findFirst();
    }
}
