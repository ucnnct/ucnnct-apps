package cc.uconnect.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Message {

    private String messageId;
    private String clientMsgId;
    private String senderId;
    private String receiverId;
    private String groupId;
    private List<String> memberIds;
    private String content;
    private String objectKey;
    private String status;
}
