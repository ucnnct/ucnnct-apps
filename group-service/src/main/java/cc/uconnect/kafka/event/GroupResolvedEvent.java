package cc.uconnect.kafka.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GroupResolvedEvent {
    private String groupId;
    private List<String> memberIds;
}
