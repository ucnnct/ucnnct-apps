package cc.uconnect.service;

import cc.uconnect.model.WsRoutedPacket;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;

@Component
@Log4j2
@RequiredArgsConstructor
public class WsRedisInstanceMessageListener implements MessageListener {

    private final ObjectMapper objectMapper;
    private final WsSessionPacketSender packetSender;
    private final WsRedisPubSubService pubSubService;

    @Override
    public void onMessage(Message message, byte[] pattern) {
        String raw = new String(message.getBody(), StandardCharsets.UTF_8);
        try {
            WsRoutedPacket routedPacket = objectMapper.readValue(raw, WsRoutedPacket.class);
            String localInstanceId = pubSubService.localInstanceId();
            log.info("FLOW ws.route-received action={} targetUserId={} sourceInstanceId={} localInstanceId={} routeOwnerInstanceId={} connectionHostedHere=true step=ws.route-received",
                    routedPacket.getPacket() == null ? null : routedPacket.getPacket().getType(),
                    routedPacket.getTargetUserId(),
                    routedPacket.getSourceInstanceId(),
                    localInstanceId,
                    routedPacket.getTargetInstanceId());
            boolean delivered = packetSender.sendPacketToUser(routedPacket.getTargetUserId(), routedPacket.getPacket());
            if (!delivered) {
                log.warn("FLOW ws.route-received-not-delivered action={} targetUserId={} sourceInstanceId={} localInstanceId={} routeOwnerInstanceId={} connectionHostedHere=true step=ws.route-received",
                        routedPacket.getPacket() == null ? null : routedPacket.getPacket().getType(),
                        routedPacket.getTargetUserId(),
                        routedPacket.getSourceInstanceId(),
                        localInstanceId,
                        routedPacket.getTargetInstanceId());
            }
        } catch (Exception ex) {
            log.error("Failed to process routed Redis packet payload={}", raw, ex);
        }
    }
}
