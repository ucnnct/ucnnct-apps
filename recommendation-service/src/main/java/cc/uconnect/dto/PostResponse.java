package cc.uconnect.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record PostResponse(
        UUID id,
        String authorId,
        String authorName,
        String authorUsername,
        String authorAvatarUrl,
        String type,
        String visibility,
        String groupId,
        String content,
        String mediaUrl,
        List<String> tags,
        long reactionCount,
        long commentCount,
        long participantCount,
        boolean reactedByMe,
        String participationStatus,
        ActivityResponse activity,
        Instant createdAt,
        Instant updatedAt
) {
}
