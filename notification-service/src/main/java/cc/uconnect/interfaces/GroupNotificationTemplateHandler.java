package cc.uconnect.interfaces;

import cc.uconnect.enums.GroupEventType;
import cc.uconnect.enums.NotificationCategory;
import cc.uconnect.model.GroupEvent;

public interface GroupNotificationTemplateHandler {

    GroupEventType eventType();

    NotificationCategory category();

    String buildInAppContent(GroupEvent event, String actorName, String groupName);

    String emailSubjectBase();

    String emailTemplateFile();

    String buildEmailHeadline(GroupEvent event, String actorName, String groupName);
}
