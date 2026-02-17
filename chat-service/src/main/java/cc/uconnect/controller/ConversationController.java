package cc.uconnect.controller;

import cc.uconnect.dto.MarkReadRequest;
import cc.uconnect.model.Conversation;
import cc.uconnect.model.Message;
import cc.uconnect.service.ConversationService;
import cc.uconnect.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ConversationController {

    private final ConversationService conversationService;
    private final MessageService messageService;

    @GetMapping("/conversations")
    public ResponseEntity<List<Conversation>> getConversations(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(conversationService.getMyConversations(jwt.getSubject()));
    }

    @GetMapping("/conversations/{conversationId}/messages")
    public ResponseEntity<Page<Message>> getMessages(
            @PathVariable String conversationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(messageService.getMessages(conversationId, page, size));
    }

    @PostMapping("/conversations/{conversationId}/read")
    public ResponseEntity<Void> markRead(
            @PathVariable String conversationId,
            @RequestBody(required = false) MarkReadRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        conversationService.markRead(conversationId, jwt.getSubject());
        return ResponseEntity.noContent().build();
    }
}
