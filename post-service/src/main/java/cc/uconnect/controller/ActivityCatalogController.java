package cc.uconnect.controller;

import cc.uconnect.dto.ActivityDomainResponse;
import cc.uconnect.dto.ActivitySuggestionResponse;
import cc.uconnect.service.ActivityCatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/activity-catalog")
@RequiredArgsConstructor
public class ActivityCatalogController {

    private final ActivityCatalogService catalogService;

    @GetMapping("/domains")
    public List<ActivityDomainResponse> domains() {
        return catalogService.listDomains();
    }

    @GetMapping("/suggestions")
    public List<ActivitySuggestionResponse> suggestions(
            @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "10") int limit) {
        return catalogService.search(q, limit);
    }
}
