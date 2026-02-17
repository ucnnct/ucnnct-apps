package cc.uconnect.kafka.event;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class GroupResolveEvent {
    private String groupId;
    private String senderId;
    private String content;
    private String format;
}
