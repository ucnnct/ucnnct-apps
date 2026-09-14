package cc.uconnect.service;

import cc.uconnect.dto.UpdateProfileRequest;
import cc.uconnect.model.User;
import cc.uconnect.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final UserDirectoryCacheService userDirectoryCacheService;

    public User getByKeycloakId(String keycloakId) {
        return userRepository.findById(keycloakId)
                .orElseThrow(() -> {
                    log.warn("User not found userId={}", keycloakId);
                    return new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
                });
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
        if (request.getCampus() != null) user.setCampus(request.getCampus());
        if (request.getSchool() != null) user.setSchool(request.getSchool());
        if (request.getInterests() != null) user.setInterests(normalizeList(request.getInterests(), 10, "Maximum 10 interests"));
        if (request.getPreferredActivityCategories() != null) {
            user.setPreferredActivityCategories(normalizeList(
                    request.getPreferredActivityCategories(),
                    5,
                    "Maximum 5 activity domains"
            ));
        }
        User saved = userRepository.save(user);
        userDirectoryCacheService.syncUser(saved);
        log.info("Profile updated userId={}", keycloakId);
        return saved;
    }

    public List<User> getAllUsers() {
        log.debug("Get all users");
        return userRepository.findAll();
    }

    public List<User> searchUsers(String query) {
        log.debug("Search users query='{}'", query);
        return userRepository.search(query);
    }

    private String normalizeList(String rawValue, int maxItems, String errorMessage) {
        List<String> values = List.of(rawValue.split(",")).stream()
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .map(value -> value.toLowerCase(Locale.ROOT))
                .distinct()
                .toList();
        if (values.size() > maxItems) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, errorMessage);
        }
        return values.stream().collect(Collectors.joining(","));
    }
}
