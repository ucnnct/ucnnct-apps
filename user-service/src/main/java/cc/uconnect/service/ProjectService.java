package cc.uconnect.service;

import cc.uconnect.dto.ProjectRequest;
import cc.uconnect.model.Project;
import cc.uconnect.model.User;
import cc.uconnect.repository.ProjectRepository;
import cc.uconnect.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    public List<Project> getMyProjects(String keycloakId) {
        log.debug("Get projects userId={}", keycloakId);
        User user = getUser(keycloakId);
        return projectRepository.findByUserOrderByCreatedAtDesc(user);
    }

    public List<Project> getUserProjects(String keycloakId) {
        log.debug("Get projects userId={}", keycloakId);
        User user = getUser(keycloakId);
        return projectRepository.findByUserOrderByCreatedAtDesc(user);
    }

    public Project create(String keycloakId, ProjectRequest request) {
        User user = getUser(keycloakId);
        Project project = new Project(
                request.getTitle(),
                request.getDescription(),
                request.getTags(),
                request.getImageUrl(),
                request.getLink(),
                user
        );
        Project saved = projectRepository.save(project);
        log.info("Project created userId={} projectId={} title='{}'", keycloakId, saved.getId(), saved.getTitle());
        return saved;
    }

    public Project update(String keycloakId, Long projectId, ProjectRequest request) {
        Project project = getOwnProject(keycloakId, projectId);
        if (request.getTitle() != null) project.setTitle(request.getTitle());
        if (request.getDescription() != null) project.setDescription(request.getDescription());
        if (request.getTags() != null) project.setTags(request.getTags());
        if (request.getImageUrl() != null) project.setImageUrl(request.getImageUrl());
        if (request.getLink() != null) project.setLink(request.getLink());
        Project saved = projectRepository.save(project);
        log.info("Project updated userId={} projectId={}", keycloakId, projectId);
        return saved;
    }

    public void delete(String keycloakId, Long projectId) {
        Project project = getOwnProject(keycloakId, projectId);
        projectRepository.delete(project);
        log.info("Project deleted userId={} projectId={}", keycloakId, projectId);
    }

    private User getUser(String keycloakId) {
        return userRepository.findById(keycloakId)
                .orElseThrow(() -> {
                    log.warn("User not found userId={}", keycloakId);
                    return new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
                });
    }

    private Project getOwnProject(String keycloakId, Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> {
                    log.warn("Project not found projectId={}", projectId);
                    return new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found");
                });
        if (!project.getUser().getKeycloakId().equals(keycloakId)) {
            log.warn("Project ownership check failed userId={} projectId={}", keycloakId, projectId);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your project");
        }
        return project;
    }
}
