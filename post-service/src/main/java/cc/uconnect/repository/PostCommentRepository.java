package cc.uconnect.repository;

import cc.uconnect.model.PostComment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PostCommentRepository extends JpaRepository<PostComment, UUID> {
    List<PostComment> findByPostIdOrderByCreatedAtAsc(UUID postId);

    long countByPostId(UUID postId);
}
