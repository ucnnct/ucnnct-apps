package cc.uconnect.service;

import cc.uconnect.configs.NotificationServiceProperties;
import cc.uconnect.enums.MessageType;
import cc.uconnect.model.Message;
import cc.uconnect.model.NotificationMessageContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

@Service
@RequiredArgsConstructor
public class NotificationMessageContextResolver {

    private final NotificationDirectoryService directoryService;
    private final NotificationServiceProperties properties;

    public Mono<NotificationMessageContext> resolve(Message message) {
        Mono<String> senderNameMono = resolveSenderName(message);
        Mono<String> groupNameMono = resolveGroupName(message);

        return Mono.zip(senderNameMono, groupNameMono)
                .map(tuple -> NotificationMessageContext.builder()
                        .senderName(tuple.getT1())
                        .groupName(tuple.getT2())
                        .build());
    }

    private Mono<String> resolveSenderName(Message message) {
        if (message == null || message.getSenderId() == null || message.getSenderId().isBlank()) {
            return Mono.just(defaultSenderName());
        }

        return directoryService.findUser(message.getSenderId())
                .map(contact -> contact.getDisplayName())
                .filter(name -> name != null && !name.isBlank())
                .defaultIfEmpty(defaultSenderName());
    }

    private Mono<String> resolveGroupName(Message message) {
        if (message == null || message.getType() != MessageType.GROUP) {
            return Mono.just("");
        }
        if (message.getGroupId() == null || message.getGroupId().isBlank()) {
            return Mono.just(defaultGroupName());
        }

        return directoryService.findGroup(message.getGroupId())
                .map(group -> group.getName())
                .filter(name -> name != null && !name.isBlank())
                .defaultIfEmpty(defaultGroupName());
    }

    private String defaultSenderName() {
        String value = properties.getNotifications().getDefaults().getSenderName();
        return value == null ? "" : value;
    }

    private String defaultGroupName() {
        String value = properties.getNotifications().getDefaults().getGroupName();
        return value == null ? "" : value;
    }
}
