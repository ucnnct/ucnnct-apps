package cc.uconnect.service;

import cc.uconnect.dto.FeedItemResponse;
import cc.uconnect.dto.FeedResponse;
import cc.uconnect.dto.PostResponse;
import cc.uconnect.dto.UserProfile;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class RecommendationService {

    private static final String ALGORITHM_VERSION = "student-feed-v1";

    private final RestClient.Builder restClientBuilder;

    @Value("${app.services.post-service-url}")
    private String postServiceUrl;

    @Value("${app.services.user-service-url}")
    private String userServiceUrl;

    @Value("${app.feed.candidate-limit:100}")
    private int candidateLimit;

    public FeedResponse recommend(Jwt jwt, String authorizationHeader, String tab, int limit) {
        String authorization = resolveAuthorization(jwt, authorizationHeader);
        String normalizedTab = normalize(tab);
        UserProfile profile = fetchProfile(authorization);
        List<PostResponse> candidates = fetchCandidates(authorization, normalizedTab);
        int safeLimit = Math.max(1, Math.min(limit, 50));

        List<FeedItemResponse> items = candidates.stream()
                .filter(post -> isEligibleForTab(post, normalizedTab))
                .map(post -> score(post, profile, normalizedTab))
                .sorted(Comparator.comparingDouble(FeedItemResponse::score).reversed())
                .limit(safeLimit)
                .toList();

        return new FeedResponse(items, Instant.now(), ALGORITHM_VERSION);
    }

    private List<PostResponse> fetchCandidates(String authorization, String tab) {
        try {
            RestClient client = restClientBuilder.baseUrl(postServiceUrl).build();
            return client.get()
                    .uri(uriBuilder -> {
                        var builder = uriBuilder.path("/api/posts/candidates")
                                .queryParam("limit", Math.max(50, candidateLimit));
                        if ("activities".equals(tab)) {
                            builder.queryParam("type", "ACTIVITY");
                        }
                        return builder.build();
                    })
                    .header(HttpHeaders.AUTHORIZATION, authorization)
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {
                    });
        } catch (Exception ex) {
            log.warn("Unable to fetch post candidates from post-service url={}", postServiceUrl, ex);
            return List.of();
        }
    }

    private UserProfile fetchProfile(String authorization) {
        try {
            RestClient client = restClientBuilder.baseUrl(userServiceUrl).build();
            return client.get()
                    .uri("/api/users/me")
                    .header(HttpHeaders.AUTHORIZATION, authorization)
                    .retrieve()
                    .body(UserProfile.class);
        } catch (Exception ex) {
            log.warn("Unable to fetch profile from user-service url={}", userServiceUrl, ex);
            return null;
        }
    }

    private FeedItemResponse score(PostResponse post, UserProfile profile, String tab) {
        List<String> reasons = new ArrayList<>();
        double score = 0;

        score += recencyScore(post.createdAt());
        score += engagementScore(post);

        if ("ACTIVITY".equalsIgnoreCase(post.type())) {
            score += 8;
            addReason(reasons, "Activite etudiante");
            score += activityDateScore(post, reasons);
        }

        if (profile != null) {
            score += profileAffinityScore(post, profile, reasons);
        }

        if ("activities".equals(tab)) {
            score += "ACTIVITY".equalsIgnoreCase(post.type()) ? 12 : -20;
        } else if ("circles".equals(tab)) {
            score += post.groupId() == null || post.groupId().isBlank() ? -20 : 10;
        } else if ("friends".equals(tab)) {
            score += 2;
        }

        if (post.authorId() != null && profile != null && post.authorId().equals(profile.keycloakId())) {
            score -= 8;
        }

        return new FeedItemResponse(post, Math.round(score * 100.0) / 100.0, reasons.stream().limit(4).toList());
    }

    private boolean isEligibleForTab(PostResponse post, String tab) {
        if ("activities".equals(tab)) {
            return "ACTIVITY".equalsIgnoreCase(post.type());
        }
        if ("circles".equals(tab)) {
            return post.groupId() != null && !post.groupId().isBlank();
        }
        return true;
    }

    private double recencyScore(Instant createdAt) {
        if (createdAt == null) {
            return 0;
        }
        long hours = Math.max(0, Duration.between(createdAt, Instant.now()).toHours());
        return Math.max(0, 18 - (hours * 0.6));
    }

    private double engagementScore(PostResponse post) {
        return Math.min(12, post.reactionCount() * 0.8 + post.commentCount() * 1.2 + post.participantCount() * 1.5);
    }

    private double activityDateScore(PostResponse post, List<String> reasons) {
        if (post.activity() == null || post.activity().startAt() == null) {
            return 0;
        }
        long hours = Duration.between(Instant.now(), post.activity().startAt()).toHours();
        if (hours >= 0 && hours <= 72) {
            addReason(reasons, "Bientot sur le campus");
            return 12;
        }
        if (hours > 72 && hours <= 24 * 14) {
            return 5;
        }
        return 0;
    }

    private double profileAffinityScore(PostResponse post, UserProfile profile, List<String> reasons) {
        double score = 0;
        Set<String> interests = split(profile.interests());
        Set<String> preferredCategories = split(profile.preferredActivityCategories());
        Set<String> tags = post.tags() == null ? Set.of() : post.tags().stream()
                .map(this::normalize)
                .filter(value -> !value.isBlank())
                .collect(Collectors.toSet());

        if (matches(profile.campus(), post.activity() == null ? null : post.activity().location())
                || matches(profile.location(), post.activity() == null ? null : post.activity().location())) {
            score += 8;
            addReason(reasons, "Proche de ton campus");
        }

        if (!interests.isEmpty() && !tags.isEmpty() && tags.stream().anyMatch(interests::contains)) {
            score += 14;
            addReason(reasons, "Correspond a tes interets");
        }

        if (post.activity() != null && preferredCategories.contains(normalize(post.activity().category()))) {
            score += 12;
            addReason(reasons, "Categorie preferee");
        }

        if (profile.fieldOfStudy() != null && tags.contains(normalize(profile.fieldOfStudy()))) {
            score += 6;
            addReason(reasons, "Lie a ta filiere");
        }

        if (post.participantCount() >= 3) {
            addReason(reasons, "Populaire chez les etudiants");
        }
        return score;
    }

    private boolean matches(String left, String right) {
        String normalizedLeft = normalize(left);
        String normalizedRight = normalize(right);
        return !normalizedLeft.isBlank()
                && !normalizedRight.isBlank()
                && (normalizedRight.contains(normalizedLeft) || normalizedLeft.contains(normalizedRight));
    }

    private Set<String> split(String value) {
        if (value == null || value.isBlank()) {
            return Set.of();
        }
        return List.of(value.split(",")).stream()
                .map(this::normalize)
                .filter(item -> !item.isBlank())
                .collect(Collectors.toSet());
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private void addReason(List<String> reasons, String reason) {
        if (!reasons.contains(reason)) {
            reasons.add(reason);
        }
    }

    private String resolveAuthorization(Jwt jwt, String authorizationHeader) {
        if (authorizationHeader != null && !authorizationHeader.isBlank()) {
            return authorizationHeader;
        }
        return "Bearer " + jwt.getTokenValue();
    }
}
