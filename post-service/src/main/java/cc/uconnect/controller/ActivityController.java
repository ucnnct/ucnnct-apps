package cc.uconnect.controller;

import cc.uconnect.dto.ParticipantResponse;
import cc.uconnect.dto.PostResponse;
import cc.uconnect.model.PostType;
import cc.uconnect.service.PostService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/activities")
@RequiredArgsConstructor
public class ActivityController {

    private final PostService postService;

    @GetMapping
    public List<PostResponse> list(@AuthenticationPrincipal Jwt jwt, @RequestParam(defaultValue = "50") int limit) {
        return postService.list(jwt, PostType.ACTIVITY, limit);
    }

    @PostMapping("/{id}/participants/me")
    public PostResponse join(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return postService.joinActivity(jwt, id);
    }

    @DeleteMapping("/{id}/participants/me")
    public PostResponse leave(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return postService.leaveActivity(jwt, id);
    }

    @DeleteMapping("/{id}/participants/{userId}")
    public PostResponse removeParticipant(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID id,
            @PathVariable String userId
    ) {
        return postService.removeActivityParticipant(jwt, id, userId);
    }

    @PostMapping("/{id}/complete")
    public PostResponse complete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return postService.completeActivity(jwt, id);
    }

    @GetMapping("/{id}/participants")
    public List<ParticipantResponse> participants(@PathVariable UUID id) {
        return postService.listActivityParticipants(id);
    }
}
