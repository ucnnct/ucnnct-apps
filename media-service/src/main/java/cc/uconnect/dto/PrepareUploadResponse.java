package cc.uconnect.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class PrepareUploadResponse {
    private String objectKey;
    private String presignedPutUrl;
    private int expiresInSeconds;
}
