package cc.uconnect.service;

import cc.uconnect.dto.ActivityResponse;
import cc.uconnect.dto.CommentResponse;
import cc.uconnect.dto.ParticipantResponse;
import cc.uconnect.dto.PostResponse;
import cc.uconnect.model.ActivityDetails;
import cc.uconnect.model.ActivityParticipant;
import cc.uconnect.model.ParticipantStatus;
import cc.uconnect.model.Post;
import cc.uconnect.model.PostComment;
import cc.uconnect.repository.ActivityDetailsRepository;
import cc.uconnect.repository.ActivityParticipantRepository;
import cc.uconnect.repository.PostReactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

@Component
@RequiredArgsConstructor
public class PostMapper {

    private final ActivityDetailsRepository activityDetailsRepository;
    private final ActivityParticipantRepository participantRepository;
    private final PostReactionRepository reactionRepository;

    public PostResponse toPostResponse(Post post, String currentUserId) {
        ActivityResponse activity = activityDetailsRepository.findByPostId(post.getId())
                .map(this::toActivityResponse)
                .orElse(null);
        boolean reactedByMe = currentUserId != null
                && reactionRepository.existsByPostIdAndUserId(post.getId(), currentUserId);
        ParticipantStatus participationStatus = currentUserId == null ? null : participantRepository
                .findByPostIdAndUserId(post.getId(), currentUserId)
                .map(ActivityParticipant::getStatus)
                .orElse(null);

        return new PostResponse(
                post.getId(),
                post.getAuthorId(),
                post.getAuthorName(),
                post.getAuthorUsername(),
                post.getAuthorAvatarUrl(),
                post.getType(),
                post.getVisibility(),
                post.getGroupId(),
                post.getContent(),
                post.getMediaUrl(),
                splitTags(post.getTags()),
                post.getReactionCount(),
                post.getCommentCount(),
                post.getParticipantCount(),
                reactedByMe,
                participationStatus,
                activity,
                post.getCreatedAt(),
                post.getUpdatedAt()
        );
    }

    public ActivityResponse toActivityResponse(ActivityDetails activity) {
        return new ActivityResponse(
                activity.getTitle(),
                activity.getCategory(),
                activity.getLocation(),
                activity.getStartAt(),
                activity.getEndAt(),
                activity.getCapacity(),
                activity.getStatus()
        );
    }

    public CommentResponse toCommentResponse(PostComment comment) {
        return new CommentResponse(
                comment.getId(),
                comment.getPostId(),
                comment.getAuthorId(),
                comment.getAuthorName(),
                comment.getContent(),
                comment.getCreatedAt()
        );
    }

    public ParticipantResponse toParticipantResponse(ActivityParticipant participant) {
        return new ParticipantResponse(
                participant.getId(),
                participant.getPostId(),
                participant.getUserId(),
                participant.getDisplayName(),
                participant.getStatus(),
                participant.getCreatedAt()
        );
    }

    private List<String> splitTags(String tags) {
        if (tags == null || tags.isBlank()) {
            return List.of();
        }
        return Arrays.stream(tags.split(","))
                .map(String::trim)
                .filter(tag -> !tag.isBlank())
                .toList();
    }
}
