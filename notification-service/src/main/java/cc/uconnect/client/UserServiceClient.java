package cc.uconnect.client;

import cc.uconnect.configs.NotificationServiceProperties;
import cc.uconnect.model.UserContact;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@Service
@Log4j2
@RequiredArgsConstructor
public class UserServiceClient {

    private final WebClient.Builder webClientBuilder;
    private final NotificationServiceProperties properties;

    public Mono<UserContact> findContact(String userId) {
        if (userId == null || userId.isBlank()) {
            return Mono.empty();
        }

        WebClient client = webClientBuilder.baseUrl(properties.getUserService().getBaseUrl()).build();
        return client.get()
                .uri(uriBuilder -> uriBuilder.path(properties.getUserService().getContactPath()).build(userId))
                .accept(MediaType.APPLICATION_JSON)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .map(body -> mapContact(userId, body))
                .filter(contact -> contact.getEmail() != null && !contact.getEmail().isBlank())
                .doOnError(ex -> log.warn("User contact lookup failed userId={}", userId, ex))
                .onErrorResume(ex -> Mono.empty());
    }

    private UserContact mapContact(String userId, JsonNode body) {
        String email = text(body, "email");
        if (email == null || email.isBlank()) {
            email = text(body.path("contact"), "email");
        }

        String displayName = text(body, "displayName");
        if (displayName == null || displayName.isBlank()) {
            String firstName = text(body, "firstName");
            String lastName = text(body, "lastName");
            displayName = (firstName + " " + lastName).trim();
        }
        if (displayName == null || displayName.isBlank()) {
            displayName = text(body, "username");
        }

        return UserContact.builder()
                .userId(userId)
                .email(email)
                .displayName(displayName)
                .build();
    }

    private String text(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || value.isNull()) {
            return null;
        }
        String result = value.asText(null);
        return result == null || result.isBlank() ? null : result;
    }
}
