package cc.uconnect.handler;

import cc.uconnect.configs.NotificationServiceProperties;
import cc.uconnect.enums.NotificationCategory;
import cc.uconnect.enums.NotificationEventType;
import cc.uconnect.model.Message;
import cc.uconnect.model.Notification;
import cc.uconnect.model.NotificationMessageContext;
import cc.uconnect.service.NotificationDispatchService;
import org.springframework.stereotype.Component;

@Component
public class GroupMessageNotificationHandler extends AbstractMessageNotificationHandler {

    public GroupMessageNotificationHandler(NotificationDispatchService notificationDispatchService,
                                           NotificationServiceProperties properties) {
        super(notificationDispatchService, properties);
    }

    @Override
    public NotificationEventType eventType() {
        return NotificationEventType.GROUP_MESSAGE;
    }

    @Override
    public Notification buildInAppNotification(String targetUserId,
                                               Message message,
                                               NotificationMessageContext context) {
        String senderName = resolveSenderName(context);
        String groupName = resolveGroupName(context);
        String preview = buildContentPreview(message);
        String previewSuffix = defaultPreview().equals(preview) ? "." : ": \"" + preview + "\"";
        String targetId = message != null && message.getGroupId() != null && !message.getGroupId().isBlank()
                ? message.getGroupId()
                : targetUserId;
        String content = resolveInAppContent(
                groupMessageProperties().getInAppPattern(),
                senderName,
                groupName,
                previewSuffix);
        return buildNotification(
                targetId,
                NotificationCategory.GROUP_MESSAGE_IN_APP,
                content);
    }

    @Override
    public String buildEmailSubject(String subjectPrefix) {
        return buildEmailSubject(subjectPrefix, groupMessageProperties().getEmailSubjectBase());
    }

    @Override
    public String getEmailHtmlBody(Message message, NotificationMessageContext context) {
        String senderName = escapeHtml(resolveSenderName(context));
        String groupName = escapeHtml(resolveGroupName(context));
        String preview = escapeHtml(buildContentPreview(message));
        String headline = resolveHeadline(groupMessageProperties().getEmailHeadlinePattern(), senderName, groupName);
        return getEmailHtmlBody(groupMessageProperties().getEmailTemplateFile(), headline, preview);
    }
}
