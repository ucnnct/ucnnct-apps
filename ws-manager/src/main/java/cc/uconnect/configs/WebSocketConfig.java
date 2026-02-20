package cc.uconnect.configs;

import cc.uconnect.handler.ChatWebSocketHandler;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.HandlerMapping;
import org.springframework.web.reactive.handler.SimpleUrlHandlerMapping;
import org.springframework.web.reactive.socket.WebSocketHandler;
import org.springframework.web.reactive.socket.server.support.WebSocketHandlerAdapter;

import java.util.HashMap;
import java.util.Map;

@Configuration
public class WebSocketConfig {

    private static final Logger logger = LogManager.getLogger(WebSocketConfig.class);

    @Bean
    public HandlerMapping webSocketMapping(ChatWebSocketHandler handler) {

        logger.info("Initializing WebSocket mapping for /ws/uconnect");

        Map<String, WebSocketHandler> map = new HashMap<>();
        map.put("/ws/uconnect", handler);

        SimpleUrlHandlerMapping mapping = new SimpleUrlHandlerMapping();
        mapping.setUrlMap(map);
        mapping.setOrder(-1); 

        return mapping;
    }

    @Bean
    public WebSocketHandlerAdapter handlerAdapter() {
        logger.info("WebSocketHandlerAdapter initialized");
        return new WebSocketHandlerAdapter();
    }
}
