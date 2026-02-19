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
    private String ownerUserId;
    private String targetId;
    private String category;
    private String content;
    private String status;
    private Long createdAt;
    private Long readAt;
}
