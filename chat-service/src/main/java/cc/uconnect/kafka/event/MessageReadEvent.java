package cc.uconnect.kafka.event;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class MessageReadEvent {
    private String messageId;
    private String readerId;
}
