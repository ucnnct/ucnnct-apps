package cc.uconnect.dto;

import java.time.Instant;
import java.util.List;

public record FeedResponse(
        List<FeedItemResponse> items,
        Instant generatedAt,
        String algorithmVersion
) {
}
