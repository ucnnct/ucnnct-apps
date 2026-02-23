package cc.uconnect.handler.friend;

import cc.uconnect.configs.NotificationServiceProperties;
import cc.uconnect.enums.FriendEventType;
import cc.uconnect.enums.NotificationCategory;
import cc.uconnect.handler.AbstractNotificationTemplateHandler;
import cc.uconnect.interfaces.FriendNotificationTemplateHandler;
import cc.uconnect.model.FriendEvent;
import org.springframework.stereotype.Component;

@Component
public class FriendRequestNotificationTemplateHandler extends AbstractNotificationTemplateHandler
        implements FriendNotificationTemplateHandler {

    public FriendRequestNotificationTemplateHandler(NotificationServiceProperties properties) {
        super(properties);
    }

    @Override
    public FriendEventType eventType() {
        return FriendEventType.FRIEND_REQUEST_SENT;
    }

    @Override
    public NotificationCategory category() {
        return NotificationCategory.FRIEND_REQUEST_IN_APP;
    }

    @Override
    public String buildInAppContent(FriendEvent event, String actorName) {
        return applyActorPattern(
                valueOrDefault(config().getInAppPattern(), "{actor} vous a envoye une demande d'ami."),
                actorName);
    }

    @Override
    public String emailSubjectBase() {
        return valueOrDefault(config().getEmailSubjectBase(), "Nouvelle demande d'ami");
    }

    @Override
    public String emailTemplateFile() {
        return valueOrDefault(config().getEmailTemplateFile(), "friend_request.html");
    }

    @Override
    public String buildEmailHeadline(FriendEvent event, String actorName) {
        return applyActorPattern(
                valueOrDefault(
                        config().getEmailHeadlinePattern(),
                        "{actor} vous a envoye une demande d'ami."),
                actorName);
    }

    private NotificationServiceProperties.FriendRequestProperties config() {
        return properties().getNotifications().getFriendRequest();
    }
}
