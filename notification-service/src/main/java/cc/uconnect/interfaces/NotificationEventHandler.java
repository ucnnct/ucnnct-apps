package cc.uconnect.interfaces;

import cc.uconnect.enums.NotificationEventType;
import cc.uconnect.model.Message;
import reactor.core.publisher.Mono;

public interface NotificationEventHandler {

    NotificationEventType eventType();

    Mono<Void> handle(Message message);
}
