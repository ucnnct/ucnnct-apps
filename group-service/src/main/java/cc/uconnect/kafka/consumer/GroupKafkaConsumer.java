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

@Component
@RequiredArgsConstructor
@Slf4j
public class GroupKafkaConsumer {

    private static final String GROUP_TYPE = "GROUP";

    private final GroupMemberRepository groupMemberRepository;
    private final GroupKafkaProducer producer;

    @KafkaListener(topics = {"${app.kafka.topics.group-resolve:group.message}", "${app.kafka.topics.group-resolve-legacy:group.resolve}"}, groupId = "group-service",
                   containerFactory = "kafkaListenerContainerFactory")
    public void onGroupResolve(GroupResolveEvent event) {
        if (event == null || event.getGroupId() == null || event.getGroupId().isBlank()) {
            log.warn("Ignoring group.resolve event: groupId is missing payload={}", event);
            return;
        }

        log.debug("Received group.resolve groupId={} senderId={} messageId={}",
                event.getGroupId(),
                event.getSenderId(),
                event.getMessageId());

        try {
            UUID groupId = UUID.fromString(event.getGroupId());
            List<String> receiversId = groupMemberRepository.findByIdGroupId(groupId)
                    .stream()
                    .map(m -> m.getId().getUserId())
                    .filter(userId -> userId != null && !userId.isBlank())
                    .distinct()
                    .toList();

            if (receiversId.isEmpty()) {
                log.warn("group.resolve returned empty member list for groupId={}", event.getGroupId());
                return;
            }

            GroupResolvedEvent resolved = GroupResolvedEvent.builder()
                    .messageId(event.getMessageId())
                    .type(GROUP_TYPE)
                    .senderId(event.getSenderId())
                    .groupId(event.getGroupId())
                    .receiversId(receiversId)
                    .content(event.getContent())
                    .objectKey(event.getObjectKey())
                    .status(event.getStatus())
                    .format(event.getFormat())
                    .build();
            producer.publishGroupResolved(resolved);

            log.debug("Published group.resolved groupId={} receiverCount={} messageId={}",
                    event.getGroupId(),
                    receiversId.size(),
                    event.getMessageId());
        } catch (IllegalArgumentException e) {
            log.warn("Invalid groupId format received in group.resolve groupId={}", event.getGroupId());
        } catch (Exception e) {
            log.error("Failed to resolve group members groupId={}", event.getGroupId(), e);
        }
    }
}
