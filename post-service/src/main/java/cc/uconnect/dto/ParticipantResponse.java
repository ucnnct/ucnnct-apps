package cc.uconnect.dto;

import cc.uconnect.model.ParticipantStatus;

import java.time.Instant;
import java.util.UUID;

public record ParticipantResponse(
        UUID id,
        UUID postId,
        String userId,
        String displayName,
        ParticipantStatus status,
        Instant createdAt
) {
}
