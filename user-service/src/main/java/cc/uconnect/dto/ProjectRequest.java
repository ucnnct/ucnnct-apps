package cc.uconnect.dto;

import lombok.Data;

@Data
public class ProjectRequest {
    private String title;
    private String description;
    private String tags;
    private String imageUrl;
    private String link;
}
