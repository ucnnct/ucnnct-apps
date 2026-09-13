package cc.uconnect.dto;

import cc.uconnect.model.PostType;
import cc.uconnect.model.PostVisibility;

import java.util.List;

public record CreatePostRequest(
        PostType type,
        PostVisibility visibility,
        String groupId,
        String content,
        String mediaUrl,
        List<String> tags,
        ActivityRequest activity
) {
}
