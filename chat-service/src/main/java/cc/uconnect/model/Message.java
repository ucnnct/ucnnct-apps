package cc.uconnect.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

@Document("messages")
@Data
@NoArgsConstructor
public class Message {

    @Id
    private String id;

    private String conversationId;
    private MessageType type;
    private String senderId;
    private String groupId;
    private List<String> receiversId;
    private String targetId;
    private String content;
    private String objectKey;
    private MessageFormat format = MessageFormat.TEXT;
    private List<String> attachments;
    private MessageStatus status = MessageStatus.SENT;
    private List<String> readBy;
    private List<String> hiddenFor;
    private boolean isEdited = false;
    private boolean isDeleted = false;
    private String replyTo;
    private Instant createdAt;
    private Instant updatedAt;
}
