package cc.uconnect.controller;

import cc.uconnect.dto.ProjectRequest;
import cc.uconnect.model.Project;
import cc.uconnect.service.ProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    @GetMapping("/me")
    public List<Project> getMyProjects(@AuthenticationPrincipal Jwt jwt) {
        return projectService.getMyProjects(jwt.getSubject());
    }

    @GetMapping("/user/{id}")
    public List<Project> getUserProjects(@PathVariable String id) {
        return projectService.getUserProjects(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Project create(@AuthenticationPrincipal Jwt jwt, @RequestBody ProjectRequest request) {
        return projectService.create(jwt.getSubject(), request);
    }

    @PutMapping("/{id}")
    public Project update(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id, @RequestBody ProjectRequest request) {
        return projectService.update(jwt.getSubject(), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        projectService.delete(jwt.getSubject(), id);
    }
}
