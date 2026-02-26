package cc.uconnect.kafka.producer;

import cc.uconnect.kafka.event.GroupEvent;
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

    @Value("${app.kafka.topics.group-events:group.event}")
    private String groupEventsTopic;

    @Value("${app.kafka.topics.group-resolved:group.resolved}")
    private String groupResolvedTopic;

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void publishGroupResolved(GroupResolvedEvent event) {
        int receiversCount = event.getReceiversId() == null ? 0 : event.getReceiversId().size();
        log.info("FLOW kafka.publish topic={} groupId={} receiversCount={} messageId={} step=group.resolved",
                groupResolvedTopic,
                event.getGroupId(),
                receiversCount,
                event.getMessageId());
        kafkaTemplate.send(groupResolvedTopic, event.getGroupId(), event);
    }

    public void publishGroupEvent(GroupEvent event) {
        if (event == null || event.getEventType() == null) {
            return;
        }

        if (event.getRecipientUserId() == null || event.getRecipientUserId().isBlank()) {
            log.warn("Skip group event publish: recipientUserId is missing eventType={} eventId={}",
                    event.getEventType(),
                    event.getEventId());
            return;
        }

        log.info("FLOW kafka.publish topic={} eventType={} eventId={} recipientUserId={} groupId={} step=group.event",
                groupEventsTopic,
                event.getEventType(),
                event.getEventId(),
                event.getRecipientUserId(),
                event.getGroupId());
        kafkaTemplate.send(groupEventsTopic, event.getRecipientUserId(), event);
    }
}
