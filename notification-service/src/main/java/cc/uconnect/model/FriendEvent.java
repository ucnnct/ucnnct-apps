package cc.uconnect.model;

import cc.uconnect.enums.FriendEventType;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class FriendEvent {

    private String eventId;
    private FriendEventType eventType;
    private Long friendshipId;
    private String requesterId;
    private String receiverId;
    private String actorUserId;
    private String recipientUserId;
    private String requesterDisplayName;
    private String receiverDisplayName;
    private Long createdAt;
}
