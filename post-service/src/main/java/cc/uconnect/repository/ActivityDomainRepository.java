package cc.uconnect.repository;

import cc.uconnect.model.ActivityDomain;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ActivityDomainRepository extends JpaRepository<ActivityDomain, Long> {
    Optional<ActivityDomain> findByNormalizedName(String normalizedName);

    List<ActivityDomain> findAllByOrderByNameAsc();
}
