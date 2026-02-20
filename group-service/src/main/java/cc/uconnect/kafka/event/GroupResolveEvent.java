package cc.uconnect.kafka.event;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class GroupResolveEvent {
    private String messageId;
    private String type;
    private String groupId;
    private String senderId;
    private List<String> receiversId;
    private String content;
    private String objectKey;
    private String status;
    private String format;
}
