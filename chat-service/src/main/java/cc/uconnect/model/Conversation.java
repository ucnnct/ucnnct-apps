package cc.uconnect.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Document("conversations")
@Data
@NoArgsConstructor
public class Conversation {

    @Id
    private String id;

    private MessageType type;
    private List<String> participants;
    private LastMessage lastMessage;
    private Map<String, Integer> unreadCounts;
    private Instant createdAt;
    private Instant updatedAt;

    @Data
    @NoArgsConstructor
    public static class LastMessage {
        private String id;
        private String senderId;
        private String content;
        private Instant createdAt;
    }
}
