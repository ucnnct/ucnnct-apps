package cc.uconnect.service;

import cc.uconnect.model.Friendship;
import cc.uconnect.model.User;
import cc.uconnect.repository.FriendshipRepository;
import cc.uconnect.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class FriendService {

    private final FriendshipRepository friendshipRepository;
    private final UserRepository userRepository;

    public Friendship sendRequest(String requesterId, String receiverId) {
        if (requesterId.equals(receiverId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot send friend request to yourself");
        }

        User requester = getUser(requesterId);
        User receiver = getUser(receiverId);

        if (friendshipRepository.existsBetween(requester, receiver)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Friend request already exists");
        }

        return friendshipRepository.save(new Friendship(requester, receiver));
    }

    public Friendship acceptRequest(String receiverId, String requesterId) {
        Friendship friendship = getPendingRequest(requesterId, receiverId);
        friendship.setStatus(Friendship.Status.ACCEPTED);
        return friendshipRepository.save(friendship);
    }

    public void rejectRequest(String receiverId, String requesterId) {
        Friendship friendship = getPendingRequest(requesterId, receiverId);
        friendshipRepository.delete(friendship);
    }

    public void removeFriend(String userId, String friendId) {
        User user = getUser(userId);
        User friend = getUser(friendId);

        Friendship friendship = friendshipRepository.findByRequesterAndReceiver(user, friend)
                .or(() -> friendshipRepository.findByRequesterAndReceiver(friend, user))
                .filter(f -> f.getStatus() == Friendship.Status.ACCEPTED)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Friendship not found"));

        friendshipRepository.delete(friendship);
    }

    public List<User> getFriends(String userId) {
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
        User user = getUser(userId);
        return friendshipRepository.findPendingRequestsFor(user);
    }

    public List<Friendship> getSentRequests(String userId) {
        User user = getUser(userId);
        return friendshipRepository.findSentRequestsBy(user);
    }

    public long countFriends(String userId) {
        User user = getUser(userId);
        return friendshipRepository.countFriends(user);
    }

    private User getUser(String keycloakId) {
        return userRepository.findById(keycloakId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private Friendship getPendingRequest(String requesterId, String receiverId) {
        User requester = getUser(requesterId);
        User receiver = getUser(receiverId);
        return friendshipRepository.findByRequesterAndReceiver(requester, receiver)
                .filter(f -> f.getStatus() == Friendship.Status.PENDING)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pending request not found"));
    }
}
