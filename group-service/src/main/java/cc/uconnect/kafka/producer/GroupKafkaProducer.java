package cc.uconnect.kafka.producer;

import cc.uconnect.kafka.event.GroupResolvedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class GroupKafkaProducer {

    @Value("${app.kafka.topics.group-resolved:group.resolved}")
    private String groupResolvedTopic;

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void publishGroupResolved(GroupResolvedEvent event) {
        int receiversCount = event.getReceiversId() == null ? 0 : event.getReceiversId().size();
        log.debug("Publishing group.resolved topic={} groupId={} receiversCount={} messageId={}",
                groupResolvedTopic,
                event.getGroupId(),
                receiversCount,
                event.getMessageId());
        kafkaTemplate.send(groupResolvedTopic, event.getGroupId(), event);
    }
}
