package cc.uconnect.interfaces;

import cc.uconnect.model.Message;
import cc.uconnect.model.Notification;
import cc.uconnect.model.NotificationMessageContext;

public interface NotificationMessageBuilder {

    Notification buildInAppNotification(String targetUserId,
                                        Message message,
                                        NotificationMessageContext context);

    String buildEmailSubject(String subjectPrefix);

    String getEmailHtmlBody(Message message, NotificationMessageContext context);
}
