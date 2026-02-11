package cc.uconnect.controller;

import cc.uconnect.dto.UpdateProfileRequest;
import cc.uconnect.model.User;
import cc.uconnect.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public User getMe(@AuthenticationPrincipal Jwt jwt) {
        return userService.getByKeycloakId(jwt.getSubject());
    }

    @PutMapping("/me")
    public User updateMe(@AuthenticationPrincipal Jwt jwt, @RequestBody UpdateProfileRequest request) {
        return userService.updateProfile(jwt.getSubject(), request);
    }

    @GetMapping("/{id}")
    public User getUserById(@PathVariable String id) {
        return userService.getByKeycloakId(id);
    }

    @GetMapping
    public List<User> getAllUsers() {
        return userService.getAllUsers();
    }

    @GetMapping("/search")
    public List<User> searchUsers(@RequestParam String q) {
        return userService.searchUsers(q);
    }
}
