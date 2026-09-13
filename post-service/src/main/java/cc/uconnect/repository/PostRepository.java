package cc.uconnect.repository;

import cc.uconnect.model.Post;
import cc.uconnect.model.PostType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PostRepository extends JpaRepository<Post, UUID> {
    List<Post> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<Post> findByTypeOrderByCreatedAtDesc(PostType type, Pageable pageable);
}
