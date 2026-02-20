package cc.uconnect.kafka.producer;

import cc.uconnect.kafka.event.GroupResolvedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class GroupKafkaProducer {

    private static final String TOPIC_GROUP_RESOLVED = "group.resolved";

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void publishGroupResolved(GroupResolvedEvent event) {
        log.debug("Publishing group.resolved for groupId={}, members={}", event.getGroupId(), event.getMemberIds().size());
        kafkaTemplate.send(TOPIC_GROUP_RESOLVED, event.getGroupId(), event);
    }
}
