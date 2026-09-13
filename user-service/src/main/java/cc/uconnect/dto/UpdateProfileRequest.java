package cc.uconnect.dto;

import lombok.Data;

@Data
public class UpdateProfileRequest {
    private String bio;
    private String university;
    private String location;
    private String website;
    private String avatarUrl;
    private String fieldOfStudy;
    private Integer yearOfStudy;
    private String campus;
    private String school;
    private String interests;
    private String preferredActivityCategories;
}
