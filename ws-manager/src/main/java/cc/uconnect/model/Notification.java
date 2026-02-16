package cc.uconnect.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Notification {

    private String notificationId;
    private String targetUserId;
    private String category;
    private String content;
    private String referenceId;
}
