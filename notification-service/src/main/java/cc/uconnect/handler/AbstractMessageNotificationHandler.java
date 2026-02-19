package cc.uconnect.handler;

import cc.uconnect.configs.NotificationServiceProperties;
import cc.uconnect.interfaces.NotificationEventHandler;
import cc.uconnect.interfaces.NotificationMessageBuilder;
import cc.uconnect.model.Message;
import cc.uconnect.model.Notification;
import cc.uconnect.model.NotificationMessageContext;
import cc.uconnect.service.NotificationDispatchService;
import lombok.RequiredArgsConstructor;
import reactor.core.publisher.Mono;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@RequiredArgsConstructor
public abstract class AbstractMessageNotificationHandler implements NotificationEventHandler, NotificationMessageBuilder {

    private final NotificationDispatchService notificationDispatchService;
    private final NotificationServiceProperties properties;
    private final Map<String, String> emailTemplateCache = new ConcurrentHashMap<>();

    @Override
    public Mono<Void> handle(Message message) {
        return notificationDispatchService.dispatchForPersistedMessage(message, this);
    }

    protected Notification buildNotification(String targetUserId,
                                             String category,
                                             String content,
                                             String conversationReference) {
        return Notification.builder()
                .notificationId(UUID.randomUUID().toString())
                .targetUserId(targetUserId)
                .category(category)
                .content(content)
                .referenceId(conversationReference)
                .build();
    }

    protected String buildEmailSubject(String subjectPrefix, String subjectBase) {
        String prefix = subjectPrefix == null ? "" : subjectPrefix.trim();
        if (prefix.isEmpty()) {
            return subjectBase;
        }
        return prefix + " " + subjectBase;
    }

    protected String buildContentPreview(Message message) {
        if (message == null || message.getContent() == null || message.getContent().isBlank()) {
            return defaultPreview();
        }
        String content = message.getContent().trim();
        if (content.length() <= 180) {
            return content;
        }
        return content.substring(0, 177) + "...";
    }

    protected String resolveSenderName(NotificationMessageContext context) {
        if (context == null || context.getSenderName() == null || context.getSenderName().isBlank()) {
            return defaultSenderName();
        }
        return context.getSenderName();
    }

    protected String resolveGroupName(NotificationMessageContext context) {
        if (context == null || context.getGroupName() == null || context.getGroupName().isBlank()) {
            return defaultGroupName();
        }
        return context.getGroupName();
    }

    protected String escapeHtml(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    protected String getEmailHtmlBody(String templateFileName, String headline, String preview) {
        String template = emailTemplateCache.computeIfAbsent(templateFileName, this::loadEmailTemplate);
        return template
                .replace(headlinePlaceholder(), headline)
                .replace(previewPlaceholder(), preview);
    }

    protected String resolveInAppContent(String pattern,
                                         String senderName,
                                         String groupName,
                                         String previewSuffix) {
        String safePattern = pattern == null ? "" : pattern;
        return safePattern
                .replace("{sender}", senderName == null ? "" : senderName)
                .replace("{group}", groupName == null ? "" : groupName)
                .replace("{previewSuffix}", previewSuffix == null ? "" : previewSuffix);
    }

    protected String resolveHeadline(String pattern, String senderName, String groupName) {
        String safePattern = pattern == null ? "" : pattern;
        return safePattern
                .replace("{sender}", senderName == null ? "" : senderName)
                .replace("{group}", groupName == null ? "" : groupName);
    }

    protected NotificationServiceProperties.PrivateMessageProperties privateMessageProperties() {
        return properties.getNotifications().getPrivateMessage();
    }

    protected NotificationServiceProperties.GroupMessageProperties groupMessageProperties() {
        return properties.getNotifications().getGroupMessage();
    }

    protected String defaultPreview() {
        return valueOrEmpty(properties.getNotifications().getDefaults().getPreview());
    }

    protected String defaultSenderName() {
        return valueOrEmpty(properties.getNotifications().getDefaults().getSenderName());
    }

    protected String defaultGroupName() {
        return valueOrEmpty(properties.getNotifications().getDefaults().getGroupName());
    }

    private String templateDirectory() {
        return valueOrEmpty(properties.getNotifications().getDefaults().getEmailTemplateDirectory());
    }

    private String headlinePlaceholder() {
        return valueOrEmpty(properties.getNotifications().getDefaults().getHeadlinePlaceholder());
    }

    private String previewPlaceholder() {
        return valueOrEmpty(properties.getNotifications().getDefaults().getPreviewPlaceholder());
    }

    private String loadEmailTemplate(String templateFileName) {
        String resourcePath = templateDirectory() + templateFileName;
        try (InputStream inputStream = Thread.currentThread()
                .getContextClassLoader()
                .getResourceAsStream(resourcePath)) {
            if (inputStream == null) {
                return defaultEmailTemplate();
            }
            return new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
        } catch (Exception ignored) {
            return defaultEmailTemplate();
        }
    }

    private String defaultEmailTemplate() {
        return headlinePlaceholder() + "<br/>" + previewPlaceholder();
    }

    private String valueOrEmpty(String value) {
        return value == null ? "" : value;
    }
}
