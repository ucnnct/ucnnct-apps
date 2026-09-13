package cc.uconnect.dto;

import java.util.List;

public record FeedItemResponse(
        PostResponse post,
        double score,
        List<String> reasons
) {
}
