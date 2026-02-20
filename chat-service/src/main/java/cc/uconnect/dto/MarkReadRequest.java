package cc.uconnect.dto;

import lombok.Data;

@Data
public class MarkReadRequest {
    private String lastReadMessageId;
}
