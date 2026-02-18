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
    private UserServiceProperties userService = new UserServiceProperties();
    private EmailProperties email = new EmailProperties();
    private KafkaProperties kafka = new KafkaProperties();

    @Data
    public static class PresenceProperties {
        private String keyPrefix = "ws:presence:user:";
    }

    @Data
    public static class ActiveContextProperties {
        private String keyPrefix = "ws:context:user:";
    }

    @Data
    public static class UserServiceProperties {
        private String baseUrl = "http://localhost:8082";
        private String contactPath = "/users/{userId}/contact";
    }

    @Data
    public static class EmailProperties {
        private String from = "no-reply@uconnect.cc";
        private String subjectPrefix = "[UConnect]";
    }

    @Data
    public static class KafkaProperties {
        private TopicsProperties topics = new TopicsProperties();
    }

    @Data
    public static class TopicsProperties {
        private String messagesPersisted = "newmessage";
        private String inAppNotifications = "inapp.notification";
    }
}
