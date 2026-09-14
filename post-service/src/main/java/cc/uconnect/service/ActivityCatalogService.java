package cc.uconnect.service;

import cc.uconnect.dto.ActivityDomainResponse;
import cc.uconnect.dto.ActivitySuggestionResponse;
import cc.uconnect.model.ActivityCatalogItem;
import cc.uconnect.model.ActivityDomain;
import cc.uconnect.repository.ActivityCatalogItemRepository;
import cc.uconnect.repository.ActivityDomainRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class ActivityCatalogService {

    private final ActivityDomainRepository domainRepository;
    private final ActivityCatalogItemRepository itemRepository;

    @Transactional(readOnly = true)
    public List<ActivityDomainResponse> listDomains() {
        return domainRepository.findAllByOrderByNameAsc().stream()
                .map(domain -> new ActivityDomainResponse(domain.getId(), domain.getName(), domain.getDescription()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ActivitySuggestionResponse> search(String query, int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 20));
        String normalizedQuery = normalize(query);
        List<ActivityCatalogItem> items = normalizedQuery.isBlank()
                ? itemRepository.findAllByOrderByUsageCountDescTitleAsc(PageRequest.of(0, safeLimit))
                : itemRepository.findByNormalizedTitleContainingOrderByUsageCountDescTitleAsc(
                normalizedQuery,
                PageRequest.of(0, safeLimit)
        );
        return items.stream().map(this::toResponse).toList();
    }

    @Transactional
    public ActivityCatalogItem ensureActivity(String title, String domainName) {
        String cleanTitle = trimRequired(title, "Activity title is required");
        ActivityDomain domain = requireDomain(domainName);
        String normalizedTitle = normalize(cleanTitle);

        return itemRepository.findByNormalizedTitle(normalizedTitle)
                .map(existing -> {
                    existing.setUsageCount(existing.getUsageCount() + 1);
                    if (existing.getDomain() == null || !existing.getDomain().getId().equals(domain.getId())) {
                        existing.setDomain(domain);
                    }
                    return existing;
                })
                .orElseGet(() -> {
                    ActivityCatalogItem item = new ActivityCatalogItem(cleanTitle, normalizedTitle, domain);
                    item.setUsageCount(1);
                    return itemRepository.save(item);
                });
    }

    @Transactional(readOnly = true)
    public ActivityDomain requireDomain(String domainName) {
        String normalizedDomain = normalize(trimRequired(domainName, "Activity domain is required"));
        return domainRepository.findByNormalizedName(normalizedDomain)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown activity domain"));
    }

    @Transactional
    ActivityDomain ensureDomain(String name, String description) {
        String cleanName = trimRequired(name, "Activity domain is required");
        String normalizedName = normalize(cleanName);
        return domainRepository.findByNormalizedName(normalizedName)
                .orElseGet(() -> domainRepository.save(new ActivityDomain(cleanName, normalizedName, description)));
    }

    @Transactional
    void ensureSeedActivity(String title, String domainName) {
        String normalizedTitle = normalize(title);
        if (normalizedTitle.isBlank() || itemRepository.findByNormalizedTitle(normalizedTitle).isPresent()) {
            return;
        }
        ActivityDomain domain = requireDomain(domainName);
        itemRepository.save(new ActivityCatalogItem(title.trim(), normalizedTitle, domain));
    }

    public String normalize(String value) {
        if (value == null) {
            return "";
        }
        String decomposed = Normalizer.normalize(value.trim(), Normalizer.Form.NFD);
        return decomposed
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", " ")
                .trim()
                .replaceAll("\\s+", " ");
    }

    private ActivitySuggestionResponse toResponse(ActivityCatalogItem item) {
        return new ActivitySuggestionResponse(
                item.getId(),
                item.getTitle(),
                item.getDomain().getName(),
                item.getUsageCount()
        );
    }

    private String trimRequired(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
        return value.trim();
    }
}
