package cc.uconnect.dto;

import java.time.Instant;
import java.util.UUID;

public record CommentResponse(
        UUID id,
        UUID postId,
        String authorId,
        String authorName,
        String content,
        Instant createdAt
) {
}
