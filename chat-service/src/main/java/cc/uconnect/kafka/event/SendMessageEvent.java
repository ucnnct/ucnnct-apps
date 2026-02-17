package cc.uconnect.kafka.event;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class SendMessageEvent {
    private String senderId;
    private String targetId;
    private String conversationId;
    private String content;
    private String format;
    private String clientMessageId;
}
