package cc.uconnect.handler;

import cc.uconnect.configs.NotificationServiceProperties;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public abstract class AbstractNotificationTemplateHandler {

    private final NotificationServiceProperties properties;

    protected NotificationServiceProperties properties() {
        return properties;
    }

    protected String applyActorPattern(String pattern, String actorName) {
        return valueOrEmpty(pattern).replace("{actor}", valueOrDefault(actorName, defaultSenderName()));
    }

    protected String applyActorGroupPattern(String pattern, String actorName, String groupName) {
        return valueOrEmpty(pattern)
                .replace("{actor}", valueOrDefault(actorName, defaultSenderName()))
                .replace("{group}", valueOrDefault(groupName, defaultGroupName()));
    }

    protected String valueOrDefault(String value, String defaultValue) {
        return (value == null || value.isBlank()) ? valueOrEmpty(defaultValue) : value;
    }

    protected String valueOrEmpty(String value) {
        return value == null ? "" : value;
    }

    protected String defaultSenderName() {
        return valueOrDefault(properties.getNotifications().getDefaults().getSenderName(), "Quelqu'un");
    }

    protected String defaultGroupName() {
        return valueOrDefault(properties.getNotifications().getDefaults().getGroupName(), "Groupe");
    }
}
