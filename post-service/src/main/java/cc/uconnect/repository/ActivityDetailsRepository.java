package cc.uconnect.repository;

import cc.uconnect.model.ActivityDetails;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ActivityDetailsRepository extends JpaRepository<ActivityDetails, Long> {
    Optional<ActivityDetails> findByPostId(UUID postId);
}
