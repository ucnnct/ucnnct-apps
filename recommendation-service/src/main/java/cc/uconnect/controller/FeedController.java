package cc.uconnect.controller;

import cc.uconnect.dto.FeedResponse;
import cc.uconnect.service.RecommendationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/feed")
@RequiredArgsConstructor
public class FeedController {

    private final RecommendationService recommendationService;

    @GetMapping
    public FeedResponse feed(
            @AuthenticationPrincipal Jwt jwt,
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @RequestParam(defaultValue = "recommended") String tab,
            @RequestParam(defaultValue = "30") int limit) {
        return recommendationService.recommend(jwt, authorization, tab, limit);
    }
}
