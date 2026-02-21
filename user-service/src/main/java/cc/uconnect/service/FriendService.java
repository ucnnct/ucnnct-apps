package cc.uconnect.service;

import cc.uconnect.model.FriendEvent;
import cc.uconnect.model.FriendEventType;
import cc.uconnect.model.Friendship;
import cc.uconnect.model.User;
import cc.uconnect.publisher.FriendEventKafkaPublisher;
import cc.uconnect.repository.FriendshipRepository;
import cc.uconnect.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
@Slf4j
public class FriendService {

    private final FriendshipRepository friendshipRepository;
    private final UserRepository userRepository;
    private final FriendEventKafkaPublisher friendEventKafkaPublisher;

    public Friendship sendRequest(String requesterId, String receiverId) {
        if (requesterId.equals(receiverId)) {
            log.warn("Self friend request rejected userId={}", requesterId);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot send friend request to yourself");
        }

        User requester = getUser(requesterId);
        User receiver = getUser(receiverId);

        Optional<Friendship> existingDirect = friendshipRepository.findByRequesterAndReceiver(requester, receiver);
        if (existingDirect.isPresent()) {
            log.warn("Duplicate direct friend request requesterId={} receiverId={}", requesterId, receiverId);
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Friend request already exists");
        }

        Optional<Friendship> existingReverse = friendshipRepository.findByRequesterAndReceiver(receiver, requester);
        if (existingReverse.isPresent()) {
            Friendship reverseFriendship = existingReverse.get();
            if (reverseFriendship.getStatus() == Friendship.Status.PENDING) {
                reverseFriendship.setStatus(Friendship.Status.ACCEPTED);
                Friendship saved = friendshipRepository.save(reverseFriendship);
                log.info("Mutual friend request auto-accepted requesterId={} receiverId={}",
                        requesterId,
                        receiverId);
                publishFriendEvent(saved, FriendEventType.FRIEND_REQUEST_ACCEPTED, requesterId, receiverId);
                return saved;
            }
            log.warn("Friendship already accepted requesterId={} receiverId={}", requesterId, receiverId);
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Friendship already exists");
        }

        Friendship friendship = friendshipRepository.save(new Friendship(requester, receiver));
        log.info("Friend request sent requesterId={} receiverId={}", requesterId, receiverId);
        publishFriendEvent(friendship, FriendEventType.FRIEND_REQUEST_SENT, requesterId, receiverId);
        return friendship;
    }

    public Friendship acceptRequest(String receiverId, String requesterId) {
        Friendship friendship = getPendingRequest(requesterId, receiverId);
        friendship.setStatus(Friendship.Status.ACCEPTED);
        Friendship saved = friendshipRepository.save(friendship);
        log.info("Friend request accepted requesterId={} receiverId={}", requesterId, receiverId);
        publishFriendEvent(saved, FriendEventType.FRIEND_REQUEST_ACCEPTED, receiverId, requesterId);
        return saved;
    }

    public void rejectRequest(String receiverId, String requesterId) {
        Friendship friendship = getPendingRequest(requesterId, receiverId);
        friendshipRepository.delete(friendship);
        log.info("Friend request rejected requesterId={} receiverId={}", requesterId, receiverId);
        publishFriendEvent(friendship, FriendEventType.FRIEND_REQUEST_REJECTED, receiverId, requesterId);
    }

    public void removeFriend(String userId, String friendId) {
        User user = getUser(userId);
        User friend = getUser(friendId);

        Friendship friendship = friendshipRepository.findByRequesterAndReceiver(user, friend)
                .or(() -> friendshipRepository.findByRequesterAndReceiver(friend, user))
                .filter(f -> f.getStatus() == Friendship.Status.ACCEPTED)
                .orElseThrow(() -> {
                    log.warn("Friendship not found userId={} friendId={}", userId, friendId);
                    return new ResponseStatusException(HttpStatus.NOT_FOUND, "Friendship not found");
                });

        friendshipRepository.delete(friendship);
        log.info("Friend removed userId={} friendId={}", userId, friendId);
        publishFriendEvent(friendship, FriendEventType.FRIEND_REMOVED, userId, friendId);
    }

    public List<User> getFriends(String userId) {
        log.debug("Get friends userId={}", userId);
        User user = getUser(userId);
        return friendshipRepository.findAcceptedFriendships(user).stream()
                .flatMap(f -> {
                    if (f.getRequester().getKeycloakId().equals(userId)) {
                        return Stream.of(f.getReceiver());
                    }
                    return Stream.of(f.getRequester());
                })
                .toList();
    }

    public List<Friendship> getPendingRequests(String userId) {
        log.debug("Get pending requests userId={}", userId);
        User user = getUser(userId);
        return friendshipRepository.findPendingRequestsFor(user);
    }

    public List<Friendship> getSentRequests(String userId) {
        log.debug("Get sent requests userId={}", userId);
        User user = getUser(userId);
        return friendshipRepository.findSentRequestsBy(user);
    }

    public long countFriends(String userId) {
        User user = getUser(userId);
        return friendshipRepository.countFriends(user);
    }

    private User getUser(String keycloakId) {
        return userRepository.findById(keycloakId)
                .orElseThrow(() -> {
                    log.warn("User not found userId={}", keycloakId);
                    return new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
                });
    }

    private Friendship getPendingRequest(String requesterId, String receiverId) {
        User requester = getUser(requesterId);
        User receiver = getUser(receiverId);
        return friendshipRepository.findByRequesterAndReceiver(requester, receiver)
                .filter(f -> f.getStatus() == Friendship.Status.PENDING)
                .orElseThrow(() -> {
                    log.warn("Pending request not found requesterId={} receiverId={}", requesterId, receiverId);
                    return new ResponseStatusException(HttpStatus.NOT_FOUND, "Pending request not found");
                });
    }

    private void publishFriendEvent(Friendship friendship,
                                    FriendEventType eventType,
                                    String actorUserId,
                                    String recipientUserId) {
        if (friendship == null || eventType == null) {
            return;
        }

        FriendEvent event = FriendEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .eventType(eventType)
                .friendshipId(friendship.getId())
                .requesterId(friendship.getRequester() == null ? null : friendship.getRequester().getKeycloakId())
                .receiverId(friendship.getReceiver() == null ? null : friendship.getReceiver().getKeycloakId())
                .actorUserId(actorUserId)
                .recipientUserId(recipientUserId)
                .requesterDisplayName(buildDisplayName(friendship.getRequester()))
                .receiverDisplayName(buildDisplayName(friendship.getReceiver()))
                .createdAt(Instant.now().toEpochMilli())
                .build();
        friendEventKafkaPublisher.publish(event);
    }

    private String buildDisplayName(User user) {
        if (user == null) {
            return "";
        }

        String first = user.getFirstName() == null ? "" : user.getFirstName().trim();
        String last = user.getLastName() == null ? "" : user.getLastName().trim();
        String fullName = (first + " " + last).trim();
        if (!fullName.isBlank()) {
            return fullName;
        }
        if (user.getUsername() != null && !user.getUsername().isBlank()) {
            return user.getUsername();
        }
        return user.getKeycloakId();
    }
}
