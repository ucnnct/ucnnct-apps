package cc.uconnect.model;

import cc.uconnect.enums.MessageType;
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
public class Message {

    private String messageId;
    private MessageType type;
    private String senderId;
    private String groupId;
    private List<String> receiversId;
    private String content;
    private String objectKey;
    private String status;
}
