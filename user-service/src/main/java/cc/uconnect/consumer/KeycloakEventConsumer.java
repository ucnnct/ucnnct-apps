package cc.uconnect.consumer;

import cc.uconnect.dto.KeycloakUserEvent;
import cc.uconnect.model.User;
import cc.uconnect.repository.UserRepository;
import cc.uconnect.service.UserDirectoryCacheService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class KeycloakEventConsumer {

    private static final Logger log = LoggerFactory.getLogger(KeycloakEventConsumer.class);

    private final UserRepository userRepository;
    private final UserDirectoryCacheService userDirectoryCacheService;
    private final ObjectMapper objectMapper;

    public KeycloakEventConsumer(UserRepository userRepository,
                                 UserDirectoryCacheService userDirectoryCacheService,
                                 ObjectMapper objectMapper) {
        this.userRepository = userRepository;
        this.userDirectoryCacheService = userDirectoryCacheService;
        this.objectMapper = objectMapper;
    }

    @KafkaListener(
            topics = "${app.kafka.topics.keycloak-user-events:keycloak-user-events}",
            groupId = "${spring.kafka.consumer.group-id:user-service}"
    )
    public void onKeycloakEvent(String message) {
        try {
            KeycloakUserEvent event = objectMapper.readValue(message, KeycloakUserEvent.class);
            log.info("Received Keycloak event: type={}, userId={}", event.getType(), event.getUserId());

            switch (event.getType()) {
                case "REGISTER" -> handleRegister(event);
                case "UPDATE_PROFILE", "UPDATE_EMAIL" -> handleUpdate(event);
                case "DELETE_ACCOUNT" -> handleDelete(event);
                default -> log.warn("Unknown event type: {}", event.getType());
            }
        } catch (Exception e) {
            log.error("Failed to process Keycloak event: {}", message, e);
        }
    }

    private void handleRegister(KeycloakUserEvent event) {
        if (userRepository.existsById(event.getUserId())) {
            log.info("User already exists, updating: {}", event.getUserId());
            handleUpdate(event);
            return;
        }

        User user = new User(
                event.getUserId(),
                event.getUsername(),
                event.getEmail(),
                event.getFirstName(),
                event.getLastName()
        );
        User saved = userRepository.save(user);
        userDirectoryCacheService.syncUser(saved);
        log.info("User created: {} ({})", event.getUsername(), event.getUserId());
    }

    private void handleUpdate(KeycloakUserEvent event) {
        userRepository.findById(event.getUserId()).ifPresentOrElse(
                user -> {
                    user.setUsername(event.getUsername());
                    user.setEmail(event.getEmail());
                    user.setFirstName(event.getFirstName());
                    user.setLastName(event.getLastName());
                    User saved = userRepository.save(user);
                    userDirectoryCacheService.syncUser(saved);
                    log.info("User updated: {} ({})", event.getUsername(), event.getUserId());
                },
                () -> {
                    log.warn("User not found for update, creating: {}", event.getUserId());
                    handleRegister(event);
                }
        );
    }

    private void handleDelete(KeycloakUserEvent event) {
        if (userRepository.existsById(event.getUserId())) {
            userRepository.deleteById(event.getUserId());
            userDirectoryCacheService.deleteUser(event.getUserId());
            log.info("User deleted: {}", event.getUserId());
        } else {
            log.warn("User not found for deletion: {}", event.getUserId());
        }
    }
}
