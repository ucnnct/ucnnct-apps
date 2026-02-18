package cc.uconnect.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class WsRedisPubSubService {

    private final WsInstanceIdentityService instanceIdentityService;

    @Value("${app.redis.pubsub.channel-prefix:ws:instance:}")
    private String channelPrefix;

    public String localChannel() {
        return buildChannel(instanceIdentityService.getInstanceId());
    }

    public String localInstanceId() {
        return instanceIdentityService.getInstanceId();
    }

    public String instanceChannel(String instanceId) {
        return buildChannel(instanceId);
    }

    private String buildChannel(String instanceId) {
        return channelPrefix + instanceId;
    }
}
