package cc.uconnect.dto;

import cc.uconnect.model.MessageFormat;
import cc.uconnect.model.MessageType;
import lombok.Data;

import java.util.List;

@Data
public class SendMessageRequest {
    private MessageType type;
    private String targetId;
    private String content;
    private MessageFormat format = MessageFormat.TEXT;
    private List<String> attachments;
    private String replyTo;
}
