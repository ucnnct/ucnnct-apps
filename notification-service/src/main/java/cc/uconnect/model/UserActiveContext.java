package cc.uconnect.model;

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
public class UserActiveContext {

    private String page;
    private String conversationId;
    private Long updatedAt;

    public static UserActiveContext empty() {
        return UserActiveContext.builder().build();
    }
}
