package cc.uconnect.configs;

import cc.uconnect.service.WsRedisInstanceMessageListener;
import cc.uconnect.service.WsRedisPubSubService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;

@Configuration
@RequiredArgsConstructor
public class RedisPubSubConfig {

    private final RedisConnectionFactory connectionFactory;
    private final WsRedisInstanceMessageListener messageListener;
    private final WsRedisPubSubService pubSubService;

    @Bean
    public RedisMessageListenerContainer redisMessageListenerContainer() {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);
        container.addMessageListener(messageListener, new ChannelTopic(pubSubService.localChannel()));
        return container;
    }
}
