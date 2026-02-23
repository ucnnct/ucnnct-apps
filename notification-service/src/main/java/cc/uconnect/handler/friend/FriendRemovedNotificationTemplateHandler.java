package cc.uconnect.handler.friend;

import cc.uconnect.configs.NotificationServiceProperties;
import cc.uconnect.enums.FriendEventType;
import cc.uconnect.enums.NotificationCategory;
import cc.uconnect.handler.AbstractNotificationTemplateHandler;
import cc.uconnect.interfaces.FriendNotificationTemplateHandler;
import cc.uconnect.model.FriendEvent;
import org.springframework.stereotype.Component;

@Component
public class FriendRemovedNotificationTemplateHandler extends AbstractNotificationTemplateHandler
        implements FriendNotificationTemplateHandler {

    public FriendRemovedNotificationTemplateHandler(NotificationServiceProperties properties) {
        super(properties);
    }

    @Override
    public FriendEventType eventType() {
        return FriendEventType.FRIEND_REMOVED;
    }

    @Override
    public NotificationCategory category() {
        return NotificationCategory.FRIEND_REMOVED_IN_APP;
    }

    @Override
    public String buildInAppContent(FriendEvent event, String actorName) {
        return applyActorPattern(
                valueOrDefault(config().getInAppPattern(), "{actor} vous a retire de ses amis."),
                actorName);
    }

    @Override
    public String emailSubjectBase() {
        return valueOrDefault(config().getEmailSubjectBase(), "Amitie terminee");
    }

    @Override
    public String emailTemplateFile() {
        return valueOrDefault(config().getEmailTemplateFile(), "friend_removed.html");
    }

    @Override
    public String buildEmailHeadline(FriendEvent event, String actorName) {
        return applyActorPattern(
                valueOrDefault(
                        config().getEmailHeadlinePattern(),
                        "{actor} vous a retire de ses amis."),
                actorName);
    }

    private NotificationServiceProperties.FriendRemovedProperties config() {
        return properties().getNotifications().getFriendRemoved();
    }
}
