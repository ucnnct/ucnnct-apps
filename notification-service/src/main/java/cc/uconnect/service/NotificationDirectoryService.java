package cc.uconnect.service;

import cc.uconnect.model.GroupInfo;
import cc.uconnect.model.UserContact;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

@Service
@RequiredArgsConstructor
public class NotificationDirectoryService {

    private final NotificationDirectoryRedisService directoryRedisService;

    public Mono<UserContact> findUser(String userId) {
        return directoryRedisService.findUser(userId);
    }

    public Mono<UserContact> findUserContact(String userId) {
        return findUser(userId)
                .filter(contact -> contact.getEmail() != null && !contact.getEmail().isBlank());
    }

    public Mono<GroupInfo> findGroup(String groupId) {
        return directoryRedisService.findGroup(groupId);
    }
}
