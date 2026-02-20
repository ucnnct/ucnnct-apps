package cc.uconnect.dto;

import cc.uconnect.model.GroupType;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
public class GroupResponse {
    private UUID id;
    private String name;
    private String description;
    private String ownerId;
    private GroupType type;
    private int memberCount;
    private Instant createdAt;
    private Instant updatedAt;
}
