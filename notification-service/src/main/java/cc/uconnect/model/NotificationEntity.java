package cc.uconnect.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("notifications")
public class NotificationEntity {

    @Id
    @Column("notification_id")
    private String notificationId;

    @Column("message_id")
    private String messageId;

    @Column("sender_id")
    private String senderId;

    @Column("target_id")
    private String targetId;

    @Column("category")
    private String category;

    @Column("content")
    private String content;

    @Column("decision_type")
    private String decisionType;

    @Column("created_at")
    private Instant createdAt;
}
