package cc.uconnect.handler.friend;

import cc.uconnect.configs.NotificationServiceProperties;
import cc.uconnect.enums.FriendEventType;
import cc.uconnect.enums.NotificationCategory;
import cc.uconnect.handler.AbstractNotificationTemplateHandler;
import cc.uconnect.interfaces.FriendNotificationTemplateHandler;
import cc.uconnect.model.FriendEvent;
import org.springframework.stereotype.Component;

@Component
public class FriendRejectedNotificationTemplateHandler extends AbstractNotificationTemplateHandler
        implements FriendNotificationTemplateHandler {

    public FriendRejectedNotificationTemplateHandler(NotificationServiceProperties properties) {
        super(properties);
    }

    @Override
    public FriendEventType eventType() {
        return FriendEventType.FRIEND_REQUEST_REJECTED;
    }

    @Override
    public NotificationCategory category() {
        return NotificationCategory.FRIEND_REQUEST_REJECTED_IN_APP;
    }

    @Override
    public String buildInAppContent(FriendEvent event, String actorName) {
        return applyActorPattern(
                valueOrDefault(config().getInAppPattern(), "{actor} a refuse votre demande d'ami."),
                actorName);
    }

    @Override
    public String emailSubjectBase() {
        return valueOrDefault(config().getEmailSubjectBase(), "Demande d'ami refusee");
    }

    @Override
    public String emailTemplateFile() {
        return valueOrDefault(config().getEmailTemplateFile(), "friend_rejected.html");
    }

    @Override
    public String buildEmailHeadline(FriendEvent event, String actorName) {
        return applyActorPattern(
                valueOrDefault(
                        config().getEmailHeadlinePattern(),
                        "{actor} a refuse votre demande d'ami."),
                actorName);
    }

    private NotificationServiceProperties.FriendRejectedProperties config() {
        return properties().getNotifications().getFriendRejected();
    }
}
