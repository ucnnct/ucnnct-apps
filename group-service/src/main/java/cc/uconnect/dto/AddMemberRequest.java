package cc.uconnect.dto;

import cc.uconnect.model.MemberRole;
import lombok.Data;

@Data
public class AddMemberRequest {
    private String userId;
    private MemberRole role = MemberRole.MEMBER;
}
