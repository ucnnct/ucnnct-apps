package cc.uconnect.dto;

import lombok.Data;

@Data
public class PrepareUploadRequest {
    private String fileName;
    private String mimeType;
    private Long size;
    private String folder;
}
