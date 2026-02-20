package cc.uconnect.dto;

import cc.uconnect.model.MemberRole;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
public class MemberResponse {
    private UUID groupId;
    private String userId;
    private MemberRole role;
    private Instant joinedAt;
}
