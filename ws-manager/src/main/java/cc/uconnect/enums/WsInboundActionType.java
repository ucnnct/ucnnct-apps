package cc.uconnect.enums;

import java.util.Arrays;
import java.util.Optional;

public enum WsInboundActionType {
    SEND_PRIVATE_MESSAGE,
    SEND_GROUP_MESSAGE;

    public static Optional<WsInboundActionType> from(String rawValue) {
        if (rawValue == null || rawValue.isBlank()) {
            return Optional.empty();
        }
        return Arrays.stream(values())
                .filter(value -> value.name().equalsIgnoreCase(rawValue))
                .findFirst();
    }
}
