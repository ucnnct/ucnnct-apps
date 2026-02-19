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
public class PrivateMessageNotificationHandler extends AbstractMessageNotificationHandler {

    public PrivateMessageNotificationHandler(NotificationDispatchService notificationDispatchService,
                                             NotificationServiceProperties properties) {
        super(notificationDispatchService, properties);
    }

    @Override
    public NotificationEventType eventType() {
        return NotificationEventType.PRIVATE_MESSAGE;
    }

    @Override
    public Notification buildInAppNotification(String targetUserId,
                                               Message message,
                                               NotificationMessageContext context) {
        String senderName = resolveSenderName(context);
        String preview = buildContentPreview(message);
        String previewSuffix = defaultPreview().equals(preview) ? "." : ": \"" + preview + "\"";
        String content = resolveInAppContent(
                privateMessageProperties().getInAppPattern(),
                senderName,
                "",
                previewSuffix);
        return buildNotification(
                targetUserId,
                NotificationCategory.PRIVATE_MESSAGE_IN_APP,
                content);
    }

    @Override
    public String buildEmailSubject(String subjectPrefix) {
        return buildEmailSubject(subjectPrefix, privateMessageProperties().getEmailSubjectBase());
    }

    @Override
    public String getEmailHtmlBody(Message message, NotificationMessageContext context) {
        String senderName = escapeHtml(resolveSenderName(context));
        String preview = escapeHtml(buildContentPreview(message));
        String headline = resolveHeadline(privateMessageProperties().getEmailHeadlinePattern(), senderName, "");
        return getEmailHtmlBody(privateMessageProperties().getEmailTemplateFile(), headline, preview);
    }
}
