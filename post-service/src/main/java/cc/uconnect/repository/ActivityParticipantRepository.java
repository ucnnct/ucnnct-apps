package cc.uconnect.repository;

import cc.uconnect.model.ActivityParticipant;
import cc.uconnect.model.ParticipantStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ActivityParticipantRepository extends JpaRepository<ActivityParticipant, UUID> {
    Optional<ActivityParticipant> findByPostIdAndUserId(UUID postId, String userId);

    List<ActivityParticipant> findByPostIdAndStatusOrderByCreatedAtAsc(UUID postId, ParticipantStatus status);

    long countByPostIdAndStatus(UUID postId, ParticipantStatus status);
}
