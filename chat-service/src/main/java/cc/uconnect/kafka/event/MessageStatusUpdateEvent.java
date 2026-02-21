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
public class MessageStatusUpdateEvent {

    private String messageId;
    private String type;
    private String senderId;
    private String groupId;
    private List<String> receiversId;
    private String status;

    // Compat legacy topic message.read
    private String readerId;
}
