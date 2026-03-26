package cc.uconnect.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WsRoutedPacket {

    private String targetUserId;
    private String sourceInstanceId;
    private String targetInstanceId;
    private WsPacket packet;
}
