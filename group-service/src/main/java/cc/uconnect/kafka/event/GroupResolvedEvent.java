package cc.uconnect.kafka.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GroupResolvedEvent {
    private String messageId;
    private String type;
    private String senderId;
    private String groupId;
    private List<String> receiversId;
    private String content;
    private String objectKey;
    private String status;
    private String format;
}
