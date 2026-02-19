package cc.uconnect.model;

import com.fasterxml.jackson.annotation.JsonAlias;
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
public class Notification {

    private String notificationId;
    @JsonAlias({"targetUserId"})
    private String ownerUserId;
    @JsonAlias({"referenceId"})
    private String targetId;
    private String category;
    private String content;
    private String status;
    private Long createdAt;
    private Long readAt;
}
