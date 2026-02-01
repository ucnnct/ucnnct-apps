package cc.uconnect.service;

import cc.uconnect.dto.ProjectRequest;
import cc.uconnect.model.Project;
import cc.uconnect.model.User;
import cc.uconnect.repository.ProjectRepository;
import cc.uconnect.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    public List<Project> getMyProjects(String keycloakId) {
        User user = getUser(keycloakId);
        return projectRepository.findByUserOrderByCreatedAtDesc(user);
    }

    public List<Project> getUserProjects(String keycloakId) {
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
        return projectRepository.save(project);
    }

    public Project update(String keycloakId, Long projectId, ProjectRequest request) {
        Project project = getOwnProject(keycloakId, projectId);
        if (request.getTitle() != null) project.setTitle(request.getTitle());
        if (request.getDescription() != null) project.setDescription(request.getDescription());
        if (request.getTags() != null) project.setTags(request.getTags());
        if (request.getImageUrl() != null) project.setImageUrl(request.getImageUrl());
        if (request.getLink() != null) project.setLink(request.getLink());
        return projectRepository.save(project);
    }

    public void delete(String keycloakId, Long projectId) {
        Project project = getOwnProject(keycloakId, projectId);
        projectRepository.delete(project);
    }

    private User getUser(String keycloakId) {
        return userRepository.findById(keycloakId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private Project getOwnProject(String keycloakId, Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
        if (!project.getUser().getKeycloakId().equals(keycloakId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your project");
        }
        return project;
    }
}
