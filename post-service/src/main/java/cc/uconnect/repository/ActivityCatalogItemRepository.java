package cc.uconnect.repository;

import cc.uconnect.model.ActivityCatalogItem;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ActivityCatalogItemRepository extends JpaRepository<ActivityCatalogItem, Long> {
    Optional<ActivityCatalogItem> findByNormalizedTitle(String normalizedTitle);

    List<ActivityCatalogItem> findByNormalizedTitleContainingOrderByUsageCountDescTitleAsc(String query, Pageable pageable);

    List<ActivityCatalogItem> findAllByOrderByUsageCountDescTitleAsc(Pageable pageable);
}
