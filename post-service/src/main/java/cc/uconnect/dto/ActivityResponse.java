package cc.uconnect.dto;

import java.time.Instant;

public record ActivityResponse(
        String title,
        String category,
        String location,
        Instant startAt,
        Instant endAt,
        Integer capacity,
        String status
) {
}
