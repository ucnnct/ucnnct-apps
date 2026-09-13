package cc.uconnect.service;

import cc.uconnect.dto.ActivityRequest;
import cc.uconnect.dto.CommentRequest;
import cc.uconnect.dto.CommentResponse;
import cc.uconnect.dto.CreatePostRequest;
import cc.uconnect.dto.ParticipantResponse;
import cc.uconnect.dto.PostResponse;
import cc.uconnect.dto.ReactionRequest;
import cc.uconnect.model.ActivityDetails;
import cc.uconnect.model.ActivityParticipant;
import cc.uconnect.model.ParticipantStatus;
import cc.uconnect.model.Post;
import cc.uconnect.model.PostComment;
import cc.uconnect.model.PostReaction;
import cc.uconnect.model.PostType;
import cc.uconnect.model.PostVisibility;
import cc.uconnect.publisher.SocialEventPublisher;
import cc.uconnect.repository.ActivityDetailsRepository;
import cc.uconnect.repository.ActivityParticipantRepository;
import cc.uconnect.repository.PostCommentRepository;
import cc.uconnect.repository.PostReactionRepository;
import cc.uconnect.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class PostService {

    private final PostRepository postRepository;
    private final ActivityDetailsRepository activityDetailsRepository;
    private final ActivityParticipantRepository participantRepository;
    private final PostReactionRepository reactionRepository;
    private final PostCommentRepository commentRepository;
    private final PostMapper postMapper;
    private final SocialEventPublisher eventPublisher;

    @Transactional
    public PostResponse create(Jwt jwt, CreatePostRequest request) {
        Post post = new Post();
        post.setAuthorId(jwt.getSubject());
        post.setAuthorName(resolveDisplayName(jwt));
        post.setAuthorUsername(jwt.getClaimAsString("preferred_username"));
        post.setAuthorAvatarUrl(jwt.getClaimAsString("picture"));
        post.setType(request.type() == null ? PostType.TEXT : request.type());
        post.setVisibility(request.visibility() == null ? PostVisibility.PUBLIC : request.visibility());
        post.setGroupId(trimToNull(request.groupId()));
        post.setContent(trimToNull(request.content()));
        post.setMediaUrl(trimToNull(request.mediaUrl()));
        post.setTags(joinTags(request.tags()));

        Post saved = postRepository.save(post);
        if (saved.getType() == PostType.ACTIVITY) {
            saveActivityDetails(saved.getId(), request.activity());
        }
        eventPublisher.publishPostEvent("POST_CREATED", saved, jwt.getSubject());
        log.info("Post created postId={} authorId={} type={}", saved.getId(), saved.getAuthorId(), saved.getType());
        return postMapper.toPostResponse(saved, jwt.getSubject());
    }

    @Transactional(readOnly = true)
    public List<PostResponse> list(Jwt jwt, PostType type, int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 100));
        List<Post> posts = type == null
                ? postRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, safeLimit))
                : postRepository.findByTypeOrderByCreatedAtDesc(type, PageRequest.of(0, safeLimit));
        return posts.stream()
                .map(post -> postMapper.toPostResponse(post, jwt.getSubject()))
                .toList();
    }

    @Transactional(readOnly = true)
    public PostResponse get(Jwt jwt, UUID postId) {
        return postMapper.toPostResponse(getPost(postId), jwt.getSubject());
    }

    @Transactional
    public PostResponse react(Jwt jwt, UUID postId, ReactionRequest request) {
        Post post = getPost(postId);
        reactionRepository.findByPostIdAndUserId(postId, jwt.getSubject())
                .ifPresentOrElse(reaction -> reaction.setType(normalizeReactionType(request)),
                        () -> {
                            PostReaction reaction = new PostReaction();
                            reaction.setPostId(postId);
                            reaction.setUserId(jwt.getSubject());
                            reaction.setType(normalizeReactionType(request));
                            reactionRepository.save(reaction);
                            post.setReactionCount(post.getReactionCount() + 1);
                        });
        Post saved = postRepository.save(post);
        eventPublisher.publishPostEvent("POST_REACTED", saved, jwt.getSubject());
        notifyAuthor(saved, jwt, resolveDisplayName(jwt) + " a reagi a votre publication.");
        return postMapper.toPostResponse(saved, jwt.getSubject());
    }

    @Transactional
    public PostResponse removeReaction(Jwt jwt, UUID postId) {
        Post post = getPost(postId);
        reactionRepository.findByPostIdAndUserId(postId, jwt.getSubject())
                .ifPresent(reaction -> {
                    reactionRepository.delete(reaction);
                    post.setReactionCount(Math.max(0, post.getReactionCount() - 1));
                });
        Post saved = postRepository.save(post);
        eventPublisher.publishPostEvent("POST_REACTION_REMOVED", saved, jwt.getSubject());
        return postMapper.toPostResponse(saved, jwt.getSubject());
    }

    @Transactional
    public CommentResponse addComment(Jwt jwt, UUID postId, CommentRequest request) {
        if (request.content() == null || request.content().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Comment content is required");
        }
        Post post = getPost(postId);
        PostComment comment = new PostComment();
        comment.setPostId(postId);
        comment.setAuthorId(jwt.getSubject());
        comment.setAuthorName(resolveDisplayName(jwt));
        comment.setContent(request.content().trim());
        PostComment savedComment = commentRepository.save(comment);
        post.setCommentCount(post.getCommentCount() + 1);
        Post savedPost = postRepository.save(post);
        eventPublisher.publishPostEvent("POST_COMMENTED", savedPost, jwt.getSubject());
        notifyAuthor(savedPost, jwt, resolveDisplayName(jwt) + " a commente votre publication.");
        return postMapper.toCommentResponse(savedComment);
    }

    @Transactional(readOnly = true)
    public List<CommentResponse> listComments(UUID postId) {
        getPost(postId);
        return commentRepository.findByPostIdOrderByCreatedAtAsc(postId).stream()
                .map(postMapper::toCommentResponse)
                .toList();
    }

    @Transactional
    public PostResponse joinActivity(Jwt jwt, UUID postId) {
        Post post = getActivityPost(postId);
        ActivityParticipant participant = participantRepository.findByPostIdAndUserId(postId, jwt.getSubject())
                .orElseGet(ActivityParticipant::new);
        participant.setPostId(postId);
        participant.setUserId(jwt.getSubject());
        participant.setDisplayName(resolveDisplayName(jwt));
        participant.setStatus(ParticipantStatus.GOING);
        participantRepository.save(participant);
        refreshParticipantCount(post);
        Post saved = postRepository.save(post);
        eventPublisher.publishPostEvent("ACTIVITY_JOINED", saved, jwt.getSubject());
        notifyAuthor(saved, jwt, resolveDisplayName(jwt) + " participe a votre activite.");
        return postMapper.toPostResponse(saved, jwt.getSubject());
    }

    @Transactional
    public PostResponse leaveActivity(Jwt jwt, UUID postId) {
        Post post = getActivityPost(postId);
        participantRepository.findByPostIdAndUserId(postId, jwt.getSubject())
                .ifPresent(participant -> {
                    participant.setStatus(ParticipantStatus.CANCELLED);
                    participantRepository.save(participant);
                });
        refreshParticipantCount(post);
        Post saved = postRepository.save(post);
        eventPublisher.publishPostEvent("ACTIVITY_LEFT", saved, jwt.getSubject());
        return postMapper.toPostResponse(saved, jwt.getSubject());
    }

    @Transactional(readOnly = true)
    public List<ParticipantResponse> listActivityParticipants(UUID postId) {
        getActivityPost(postId);
        return participantRepository.findByPostIdAndStatusOrderByCreatedAtAsc(postId, ParticipantStatus.GOING).stream()
                .map(postMapper::toParticipantResponse)
                .toList();
    }

    private void saveActivityDetails(UUID postId, ActivityRequest activityRequest) {
        if (activityRequest == null || activityRequest.title() == null || activityRequest.title().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Activity title is required");
        }
        ActivityDetails activity = new ActivityDetails();
        activity.setPostId(postId);
        activity.setTitle(activityRequest.title().trim());
        activity.setCategory(trimToNull(activityRequest.category()));
        activity.setLocation(trimToNull(activityRequest.location()));
        activity.setStartAt(activityRequest.startAt());
        activity.setEndAt(activityRequest.endAt());
        activity.setCapacity(activityRequest.capacity());
        activityDetailsRepository.save(activity);
    }

    private Post getActivityPost(UUID postId) {
        Post post = getPost(postId);
        if (post.getType() != PostType.ACTIVITY) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Post is not an activity");
        }
        return post;
    }

    private Post getPost(UUID postId) {
        return postRepository.findById(postId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found"));
    }

    private void refreshParticipantCount(Post post) {
        post.setParticipantCount(participantRepository.countByPostIdAndStatus(post.getId(), ParticipantStatus.GOING));
    }

    private void notifyAuthor(Post post, Jwt jwt, String content) {
        if (!post.getAuthorId().equals(jwt.getSubject())) {
            eventPublisher.publishInAppNotification(post.getAuthorId(), post.getId().toString(), "SOCIAL", content);
        }
    }

    private String resolveDisplayName(Jwt jwt) {
        String name = jwt.getClaimAsString("name");
        if (name != null && !name.isBlank()) {
            return name;
        }
        String firstName = jwt.getClaimAsString("given_name");
        String lastName = jwt.getClaimAsString("family_name");
        String fullName = String.join(" ", List.of(
                firstName == null ? "" : firstName,
                lastName == null ? "" : lastName
        )).trim();
        if (!fullName.isBlank()) {
            return fullName;
        }
        String username = jwt.getClaimAsString("preferred_username");
        return username == null || username.isBlank() ? jwt.getSubject() : username;
    }

    private String joinTags(List<String> tags) {
        if (tags == null || tags.isEmpty()) {
            return null;
        }
        String joined = tags.stream()
                .map(this::trimToNull)
                .filter(tag -> tag != null && !tag.isBlank())
                .map(String::toLowerCase)
                .distinct()
                .reduce((left, right) -> left + "," + right)
                .orElse(null);
        return trimToNull(joined);
    }

    private String normalizeReactionType(ReactionRequest request) {
        if (request == null || request.type() == null || request.type().isBlank()) {
            return "LIKE";
        }
        return request.type().trim().toUpperCase();
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
