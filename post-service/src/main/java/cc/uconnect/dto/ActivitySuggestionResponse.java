package cc.uconnect.dto;

public record ActivitySuggestionResponse(
        Long id,
        String title,
        String domain,
        long usageCount
) {
}
