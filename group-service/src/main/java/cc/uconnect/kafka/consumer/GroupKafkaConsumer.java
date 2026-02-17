package cc.uconnect.kafka.consumer;

import cc.uconnect.kafka.event.GroupResolveEvent;
import cc.uconnect.kafka.event.GroupResolvedEvent;
import cc.uconnect.kafka.producer.GroupKafkaProducer;
import cc.uconnect.repository.GroupMemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class GroupKafkaConsumer {

    private final GroupMemberRepository groupMemberRepository;
    private final GroupKafkaProducer producer;

    @KafkaListener(topics = "group.resolve", groupId = "group-service",
                   containerFactory = "kafkaListenerContainerFactory")
    public void onGroupResolve(GroupResolveEvent event) {
        log.debug("Received group.resolve groupId={} senderId={}", event.getGroupId(), event.getSenderId());
        try {
            UUID groupId = UUID.fromString(event.getGroupId());
            List<String> memberIds = groupMemberRepository.findByIdGroupId(groupId)
                    .stream()
                    .map(m -> m.getId().getUserId())
                    .collect(Collectors.toList());

            if (memberIds.isEmpty()) {
                log.warn("group.resolve returned empty member list for groupId={}", event.getGroupId());
            }

            GroupResolvedEvent resolved = new GroupResolvedEvent(event.getGroupId(), memberIds);
            producer.publishGroupResolved(resolved);

            log.debug("Published group.resolved groupId={} memberCount={}", event.getGroupId(), memberIds.size());
        } catch (IllegalArgumentException e) {
            log.warn("Invalid groupId format received in group.resolve groupId={}", event.getGroupId());
        } catch (Exception e) {
            log.error("Failed to resolve group members groupId={}", event.getGroupId(), e);
        }
    }
}
