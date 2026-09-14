package cc.uconnect.dto;

import java.time.Instant;

public record ActivityRequest(
        String title,
        String category,
        String domain,
        String location,
        Instant startAt,
        Instant endAt,
        Integer capacity
) {
}
