package cc.uconnect.handler.group;

import cc.uconnect.configs.NotificationServiceProperties;
import cc.uconnect.enums.GroupEventType;
import cc.uconnect.enums.NotificationCategory;
import cc.uconnect.handler.AbstractNotificationTemplateHandler;
import cc.uconnect.interfaces.GroupNotificationTemplateHandler;
import cc.uconnect.model.GroupEvent;
import org.springframework.stereotype.Component;

@Component
public class GroupDeletedNotificationTemplateHandler extends AbstractNotificationTemplateHandler
        implements GroupNotificationTemplateHandler {

    public GroupDeletedNotificationTemplateHandler(NotificationServiceProperties properties) {
        super(properties);
    }

    @Override
    public GroupEventType eventType() {
        return GroupEventType.GROUP_DELETED;
    }

    @Override
    public NotificationCategory category() {
        return NotificationCategory.GROUP_DELETED_IN_APP;
    }

    @Override
    public String buildInAppContent(GroupEvent event, String actorName, String groupName) {
        return applyActorGroupPattern(
                valueOrDefault(config().getInAppPattern(), "{actor} a supprime le groupe {group}."),
                actorName,
                groupName);
    }

    @Override
    public String emailSubjectBase() {
        return valueOrDefault(config().getEmailSubjectBase(), "Suppression de groupe");
    }

    @Override
    public String emailTemplateFile() {
        return valueOrDefault(config().getEmailTemplateFile(), "group_deleted.html");
    }

    @Override
    public String buildEmailHeadline(GroupEvent event, String actorName, String groupName) {
        return applyActorGroupPattern(
                valueOrDefault(
                        config().getEmailHeadlinePattern(),
                        "{actor} a supprime le groupe {group}."),
                actorName,
                groupName);
    }

    private NotificationServiceProperties.GroupDeletedProperties config() {
        return properties().getNotifications().getGroupDeleted();
    }
}
