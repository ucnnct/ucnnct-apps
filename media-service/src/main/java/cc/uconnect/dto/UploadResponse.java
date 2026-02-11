package cc.uconnect.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class UploadResponse {
    private String url;
    private String key;
}
