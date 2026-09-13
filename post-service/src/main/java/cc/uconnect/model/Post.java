package cc.uconnect.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "posts")
@Getter
@Setter
@NoArgsConstructor
public class Post {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "author_id", nullable = false)
    private String authorId;

    @Column(name = "author_name")
    private String authorName;

    @Column(name = "author_username")
    private String authorUsername;

    @Column(name = "author_avatar_url")
    private String authorAvatarUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PostType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PostVisibility visibility = PostVisibility.PUBLIC;

    @Column(name = "group_id")
    private String groupId;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(name = "media_url")
    private String mediaUrl;

    @Column(columnDefinition = "TEXT")
    private String tags;

    @Column(name = "reaction_count", nullable = false)
    private long reactionCount;

    @Column(name = "comment_count", nullable = false)
    private long commentCount;

    @Column(name = "participant_count", nullable = false)
    private long participantCount;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void prePersist() {
        createdAt = Instant.now();
        updatedAt = Instant.now();
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }
}
