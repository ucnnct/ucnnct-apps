package cc.uconnect.controller;

import cc.uconnect.model.Friendship;
import cc.uconnect.model.User;
import cc.uconnect.service.FriendService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/friends")
@RequiredArgsConstructor
public class FriendController {

    private final FriendService friendService;

    @PostMapping("/request/{id}")
    @ResponseStatus(HttpStatus.CREATED)
    public Friendship sendRequest(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        return friendService.sendRequest(jwt.getSubject(), id);
    }

    @PostMapping("/accept/{id}")
    public Friendship acceptRequest(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        return friendService.acceptRequest(jwt.getSubject(), id);
    }

    @PostMapping("/reject/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void rejectRequest(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        friendService.rejectRequest(jwt.getSubject(), id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeFriend(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        friendService.removeFriend(jwt.getSubject(), id);
    }

    @GetMapping
    public List<User> getMyFriends(@AuthenticationPrincipal Jwt jwt) {
        return friendService.getFriends(jwt.getSubject());
    }

    @GetMapping("/requests")
    public List<Friendship> getPendingRequests(@AuthenticationPrincipal Jwt jwt) {
        return friendService.getPendingRequests(jwt.getSubject());
    }

    @GetMapping("/sent")
    public List<Friendship> getSentRequests(@AuthenticationPrincipal Jwt jwt) {
        return friendService.getSentRequests(jwt.getSubject());
    }

    @GetMapping("/count")
    public Map<String, Long> countFriends(@AuthenticationPrincipal Jwt jwt) {
        return Map.of("count", friendService.countFriends(jwt.getSubject()));
    }
}
