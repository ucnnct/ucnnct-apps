package cc.uconnect.repository;

import cc.uconnect.model.Project;
import cc.uconnect.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProjectRepository extends JpaRepository<Project, Long> {

    List<Project> findByUserOrderByCreatedAtDesc(User user);
}
