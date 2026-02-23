package cc.uconnect.handler.group;

import cc.uconnect.configs.NotificationServiceProperties;
import cc.uconnect.enums.GroupEventType;
import cc.uconnect.enums.NotificationCategory;
import cc.uconnect.handler.AbstractNotificationTemplateHandler;
import cc.uconnect.interfaces.GroupNotificationTemplateHandler;
import cc.uconnect.model.GroupEvent;
import org.springframework.stereotype.Component;

@Component
public class GroupMemberAddedNotificationTemplateHandler extends AbstractNotificationTemplateHandler
        implements GroupNotificationTemplateHandler {

    public GroupMemberAddedNotificationTemplateHandler(NotificationServiceProperties properties) {
        super(properties);
    }

    @Override
    public GroupEventType eventType() {
        return GroupEventType.MEMBER_ADDED;
    }

    @Override
    public NotificationCategory category() {
        return NotificationCategory.GROUP_MEMBER_ADDED_IN_APP;
    }

    @Override
    public String buildInAppContent(GroupEvent event, String actorName, String groupName) {
        return applyActorGroupPattern(
                valueOrDefault(config().getInAppPattern(), "{actor} vous a ajoute au groupe {group}."),
                actorName,
                groupName);
    }

    @Override
    public String emailSubjectBase() {
        return valueOrDefault(config().getEmailSubjectBase(), "Ajout dans un groupe");
    }

    @Override
    public String emailTemplateFile() {
        return valueOrDefault(config().getEmailTemplateFile(), "group_member_added.html");
    }

    @Override
    public String buildEmailHeadline(GroupEvent event, String actorName, String groupName) {
        return applyActorGroupPattern(
                valueOrDefault(
                        config().getEmailHeadlinePattern(),
                        "{actor} vous a ajoute au groupe {group}."),
                actorName,
                groupName);
    }

    private NotificationServiceProperties.GroupMemberAddedProperties config() {
        return properties().getNotifications().getGroupMemberAdded();
    }
}
