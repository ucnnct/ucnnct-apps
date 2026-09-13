package cc.uconnect.controller;

import cc.uconnect.dto.CommentRequest;
import cc.uconnect.dto.CommentResponse;
import cc.uconnect.dto.CreatePostRequest;
import cc.uconnect.dto.PostResponse;
import cc.uconnect.dto.ReactionRequest;
import cc.uconnect.model.PostType;
import cc.uconnect.service.PostService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;

    @GetMapping
    public List<PostResponse> list(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) PostType type,
            @RequestParam(defaultValue = "50") int limit) {
        return postService.list(jwt, type, limit);
    }

    @GetMapping("/candidates")
    public List<PostResponse> candidates(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) PostType type,
            @RequestParam(defaultValue = "100") int limit) {
        return postService.list(jwt, type, limit);
    }

    @GetMapping("/{id}")
    public PostResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return postService.get(jwt, id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PostResponse create(@AuthenticationPrincipal Jwt jwt, @RequestBody CreatePostRequest request) {
        return postService.create(jwt, request);
    }

    @PostMapping("/{id}/reactions")
    public PostResponse react(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID id,
            @RequestBody(required = false) ReactionRequest request) {
        return postService.react(jwt, id, request);
    }

    @DeleteMapping("/{id}/reactions")
    public PostResponse removeReaction(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return postService.removeReaction(jwt, id);
    }

    @GetMapping("/{id}/comments")
    public List<CommentResponse> listComments(@PathVariable UUID id) {
        return postService.listComments(id);
    }

    @PostMapping("/{id}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public CommentResponse addComment(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID id,
            @RequestBody CommentRequest request) {
        return postService.addComment(jwt, id, request);
    }
}
