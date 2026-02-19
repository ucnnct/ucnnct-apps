package cc.uconnect.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationPageResponse {

    private List<Notification> notifications;
    private int limit;
    private boolean hasMore;
    private String nextCursor;
}
