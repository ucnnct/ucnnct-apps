package cc.uconnect.controller;

import cc.uconnect.dto.EditMessageRequest;
import cc.uconnect.dto.SendMessageRequest;
import cc.uconnect.model.Message;
import cc.uconnect.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/chat/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;

    @PostMapping
    public ResponseEntity<Message> sendMessage(
            @RequestBody SendMessageRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(messageService.sendMessage(req, jwt.getSubject()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Message> editMessage(
            @PathVariable String id,
            @RequestBody EditMessageRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(messageService.editMessage(id, req.getContent(), jwt.getSubject()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Message> deleteMessage(
            @PathVariable String id,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(messageService.softDeleteMessage(id, jwt.getSubject()));
    }
}
