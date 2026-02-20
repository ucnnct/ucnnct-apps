package cc.uconnect.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PresenceSnapshot {

    private String userId;
    private boolean online;
    private String instanceId;
    private UserActiveContext activeContext;
}
