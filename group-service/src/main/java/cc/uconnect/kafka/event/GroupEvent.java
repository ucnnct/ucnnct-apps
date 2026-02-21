package cc.uconnect.kafka.event;

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
public class GroupEvent {
    private String eventId;
    private GroupEventType eventType;
    private String groupId;
    private String groupName;
    private String groupOwnerId;
    private String actorUserId;
    private String recipientUserId;
    private String affectedUserId;
    private Integer memberCount;
    private Long createdAt;
}
