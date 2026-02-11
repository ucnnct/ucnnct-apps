package cc.uconnect.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class KeycloakUserEvent {
    private String type;
    private String userId;
    private String username;
    private String email;
    private String firstName;
    private String lastName;
    private long timestamp;
}
