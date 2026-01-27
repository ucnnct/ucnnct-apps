package cc.uconnect.service;

import cc.uconnect.dto.UpdateProfileRequest;
import cc.uconnect.model.User;
import cc.uconnect.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public User getByKeycloakId(String keycloakId) {
        return userRepository.findById(keycloakId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    public User updateProfile(String keycloakId, UpdateProfileRequest request) {
        User user = getByKeycloakId(keycloakId);
        if (request.getBio() != null) user.setBio(request.getBio());
        if (request.getUniversity() != null) user.setUniversity(request.getUniversity());
        if (request.getLocation() != null) user.setLocation(request.getLocation());
        if (request.getWebsite() != null) user.setWebsite(request.getWebsite());
        if (request.getAvatarUrl() != null) user.setAvatarUrl(request.getAvatarUrl());
        if (request.getFieldOfStudy() != null) user.setFieldOfStudy(request.getFieldOfStudy());
        if (request.getYearOfStudy() != null) user.setYearOfStudy(request.getYearOfStudy());
        return userRepository.save(user);
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public List<User> searchUsers(String query) {
        return userRepository.search(query);
    }
}
