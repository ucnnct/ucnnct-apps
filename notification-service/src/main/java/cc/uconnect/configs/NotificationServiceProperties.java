package cc.uconnect.configs;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "app")
public class NotificationServiceProperties {

    private PresenceProperties presence = new PresenceProperties();
    private ActiveContextProperties activeContext = new ActiveContextProperties();
    private DirectoryProperties directory = new DirectoryProperties();
    private NotificationsProperties notifications = new NotificationsProperties();
    private EmailProperties email = new EmailProperties();
    private KafkaProperties kafka = new KafkaProperties();

    @Data
    public static class PresenceProperties {
        private String keyPrefix;
    }

    @Data
    public static class ActiveContextProperties {
        private String keyPrefix;
    }

    @Data
    public static class DirectoryProperties {
        private String userKeyPrefix;
        private String groupKeyPrefix;
    }

    @Data
    public static class NotificationsProperties {
        private DefaultsProperties defaults = new DefaultsProperties();
        private PrivateMessageProperties privateMessage = new PrivateMessageProperties();
        private GroupMessageProperties groupMessage = new GroupMessageProperties();
    }

    @Data
    public static class DefaultsProperties {
        private String preview;
        private String senderName;
        private String groupName;
        private String emailTemplateDirectory;
        private String headlinePlaceholder;
        private String previewPlaceholder;
    }

    @Data
    public static class PrivateMessageProperties {
        private String inAppCategory;
        private String emailSubjectBase;
        private String emailTemplateFile;
        private String inAppPattern;
        private String emailHeadlinePattern;
    }

    @Data
    public static class GroupMessageProperties {
        private String inAppCategory;
        private String emailSubjectBase;
        private String emailTemplateFile;
        private String inAppPattern;
        private String emailHeadlinePattern;
    }

    @Data
    public static class EmailProperties {
        private String from;
        private String subjectPrefix;
    }

    @Data
    public static class KafkaProperties {
        private TopicsProperties topics = new TopicsProperties();
    }

    @Data
    public static class TopicsProperties {
        private String messagesPersisted;
        private String inAppNotifications;
    }
}
