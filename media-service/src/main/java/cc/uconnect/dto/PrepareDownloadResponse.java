package cc.uconnect.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class PrepareDownloadResponse {
    private String objectKey;
    private String presignedGetUrl;
    private int expiresInSeconds;
}
