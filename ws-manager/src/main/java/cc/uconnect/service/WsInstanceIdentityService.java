package cc.uconnect.service;

import jakarta.annotation.PostConstruct;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@Log4j2
public class WsInstanceIdentityService {

    private final String configuredInstanceId;
    private String instanceId;

    public WsInstanceIdentityService(@Value("${app.instance.id:}") String configuredInstanceId) {
        this.configuredInstanceId = configuredInstanceId;
    }

    @PostConstruct
    public void init() {
        if (configuredInstanceId != null && !configuredInstanceId.isBlank()) {
            instanceId = configuredInstanceId;
        } else {
            instanceId = ""+UUID.randomUUID();
        }
        log.info("WebSocket manager instanceId initialized: {}", instanceId);
    }

    public String getInstanceId() {
        return instanceId;
    }
}
