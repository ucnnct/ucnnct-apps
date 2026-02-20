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

    @Override
    public void onMessage(Message message, byte[] pattern) {
        String raw = new String(message.getBody(), StandardCharsets.UTF_8);
        try {
            WsRoutedPacket routedPacket = objectMapper.readValue(raw, WsRoutedPacket.class);
            boolean delivered = packetSender.sendPacketToUser(routedPacket.getTargetUserId(), routedPacket.getPacket());
            if (!delivered) {
                log.debug("Routed packet received but not delivered targetUserId={}", routedPacket.getTargetUserId());
            }
        } catch (Exception ex) {
            log.error("Failed to process routed Redis packet payload={}", raw, ex);
        }
    }
}
