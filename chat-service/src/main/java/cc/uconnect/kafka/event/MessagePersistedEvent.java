package cc.uconnect.kafka.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MessagePersistedEvent {
    private String messageId;
    private String senderId;
    private String targetId;
    private String conversationId;
    private long createdAt;
}
