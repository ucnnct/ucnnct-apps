package cc.uconnect.dto;

import cc.uconnect.model.ParticipantStatus;
import cc.uconnect.model.PostType;
import cc.uconnect.model.PostVisibility;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record PostResponse(
        UUID id,
        String authorId,
        String authorName,
        String authorUsername,
        String authorAvatarUrl,
        PostType type,
        PostVisibility visibility,
        String groupId,
        String content,
        String mediaUrl,
        List<String> tags,
        long reactionCount,
        long commentCount,
        long participantCount,
        boolean reactedByMe,
        ParticipantStatus participationStatus,
        ActivityResponse activity,
        Instant createdAt,
        Instant updatedAt
) {
}
