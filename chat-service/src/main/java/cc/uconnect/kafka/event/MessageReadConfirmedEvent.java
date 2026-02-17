package cc.uconnect.kafka.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MessageReadConfirmedEvent {
    private String messageId;
    private String readerId;
    private String senderId;
}
