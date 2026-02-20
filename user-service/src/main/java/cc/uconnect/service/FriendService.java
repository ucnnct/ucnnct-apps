package cc.uconnect.service;

import cc.uconnect.model.Friendship;
import cc.uconnect.model.User;
import cc.uconnect.repository.FriendshipRepository;
import cc.uconnect.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
@Slf4j
public class FriendService {

    private final FriendshipRepository friendshipRepository;
    private final UserRepository userRepository;

    public Friendship sendRequest(String requesterId, String receiverId) {
        if (requesterId.equals(receiverId)) {
            log.warn("Self friend request rejected userId={}", requesterId);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot send friend request to yourself");
        }

        User requester = getUser(requesterId);
        User receiver = getUser(receiverId);

        if (friendshipRepository.existsBetween(requester, receiver)) {
            log.warn("Duplicate friend request requesterId={} receiverId={}", requesterId, receiverId);
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Friend request already exists");
        }

        Friendship friendship = friendshipRepository.save(new Friendship(requester, receiver));
        log.info("Friend request sent requesterId={} receiverId={}", requesterId, receiverId);
        return friendship;
    }

    public Friendship acceptRequest(String receiverId, String requesterId) {
        Friendship friendship = getPendingRequest(requesterId, receiverId);
        friendship.setStatus(Friendship.Status.ACCEPTED);
        Friendship saved = friendshipRepository.save(friendship);
        log.info("Friend request accepted requesterId={} receiverId={}", requesterId, receiverId);
        return saved;
    }

    public void rejectRequest(String receiverId, String requesterId) {
        Friendship friendship = getPendingRequest(requesterId, receiverId);
        friendshipRepository.delete(friendship);
        log.info("Friend request rejected requesterId={} receiverId={}", requesterId, receiverId);
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
}
