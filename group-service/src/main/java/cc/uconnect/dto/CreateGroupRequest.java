package cc.uconnect.dto;

import cc.uconnect.model.GroupType;
import lombok.Data;

@Data
public class CreateGroupRequest {
    private String name;
    private String description;
    private GroupType type = GroupType.PRIVATE;
}
