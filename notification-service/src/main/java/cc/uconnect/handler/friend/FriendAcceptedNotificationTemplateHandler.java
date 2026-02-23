package cc.uconnect.handler.friend;

import cc.uconnect.configs.NotificationServiceProperties;
import cc.uconnect.enums.FriendEventType;
import cc.uconnect.enums.NotificationCategory;
import cc.uconnect.handler.AbstractNotificationTemplateHandler;
import cc.uconnect.interfaces.FriendNotificationTemplateHandler;
import cc.uconnect.model.FriendEvent;
import org.springframework.stereotype.Component;

@Component
public class FriendAcceptedNotificationTemplateHandler extends AbstractNotificationTemplateHandler
        implements FriendNotificationTemplateHandler {

    public FriendAcceptedNotificationTemplateHandler(NotificationServiceProperties properties) {
        super(properties);
    }

    @Override
    public FriendEventType eventType() {
        return FriendEventType.FRIEND_REQUEST_ACCEPTED;
    }

    @Override
    public NotificationCategory category() {
        return NotificationCategory.FRIEND_REQUEST_ACCEPTED_IN_APP;
    }

    @Override
    public String buildInAppContent(FriendEvent event, String actorName) {
        return applyActorPattern(
                valueOrDefault(config().getInAppPattern(), "{actor} a accepte votre demande d'ami."),
                actorName);
    }

    @Override
    public String emailSubjectBase() {
        return valueOrDefault(config().getEmailSubjectBase(), "Demande d'ami acceptee");
    }

    @Override
    public String emailTemplateFile() {
        return valueOrDefault(config().getEmailTemplateFile(), "friend_accepted.html");
    }

    @Override
    public String buildEmailHeadline(FriendEvent event, String actorName) {
        return applyActorPattern(
                valueOrDefault(
                        config().getEmailHeadlinePattern(),
                        "{actor} a accepte votre demande d'ami."),
                actorName);
    }

    private NotificationServiceProperties.FriendAcceptedProperties config() {
        return properties().getNotifications().getFriendAccepted();
    }
}
