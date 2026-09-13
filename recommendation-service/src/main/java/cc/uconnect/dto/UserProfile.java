package cc.uconnect.dto;

public record UserProfile(
        String keycloakId,
        String username,
        String email,
        String firstName,
        String lastName,
        String university,
        String location,
        String fieldOfStudy,
        Integer yearOfStudy,
        String campus,
        String school,
        String interests,
        String preferredActivityCategories
) {
}
