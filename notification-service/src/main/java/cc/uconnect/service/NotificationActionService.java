package cc.uconnect.service;

import cc.uconnect.enums.NotificationEventType;
import cc.uconnect.interfaces.NotificationEventHandler;
import cc.uconnect.model.Message;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Service
@Log4j2
@RequiredArgsConstructor
public class NotificationActionService {

    private final List<NotificationEventHandler> eventHandlers;
    private final Map<NotificationEventType, NotificationEventHandler> handlersByType =
            new EnumMap<>(NotificationEventType.class);

    @PostConstruct
    public void init() {
        for (NotificationEventHandler eventHandler : eventHandlers) {
            NotificationEventHandler existing = handlersByType.putIfAbsent(eventHandler.eventType(), eventHandler);
            if (existing != null) {
                throw new IllegalStateException("Duplicate notification handler for type " + eventHandler.eventType());
            }
        }
    }

    public Mono<Void> handlePersistedMessage(Message message) {
        NotificationEventType eventType = NotificationEventType.fromMessage(message).orElse(null);
        if (eventType == null) {
            return Mono.fromRunnable(() -> log.warn(
                    "Skip notification processing: unsupported message type messageId={} type={}",
                    message == null ? null : message.getMessageId(),
                    message == null || message.getType() == null ? null : message.getType().name()));
        }

        NotificationEventHandler eventHandler = handlersByType.get(eventType);
        if (eventHandler == null) {
            return Mono.fromRunnable(() -> log.warn(
                    "Skip notification processing: no handler registered eventType={} messageId={}",
                    eventType,
                    message == null ? null : message.getMessageId()));
        }

        log.info("FLOW notification.handler-selected eventType={} messageId={} handler={} step=notification.dispatch",
                eventType,
                message.getMessageId(),
                eventHandler.getClass().getSimpleName());
        return eventHandler.handle(message);
    }
}
