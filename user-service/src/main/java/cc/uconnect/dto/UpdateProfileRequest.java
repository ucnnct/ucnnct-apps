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
}
