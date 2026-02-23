package cc.uconnect.interfaces;

import cc.uconnect.enums.FriendEventType;
import cc.uconnect.enums.NotificationCategory;
import cc.uconnect.model.FriendEvent;

public interface FriendNotificationTemplateHandler {

    FriendEventType eventType();

    NotificationCategory category();

    String buildInAppContent(FriendEvent event, String actorName);

    String emailSubjectBase();

    String emailTemplateFile();

    String buildEmailHeadline(FriendEvent event, String actorName);
}
