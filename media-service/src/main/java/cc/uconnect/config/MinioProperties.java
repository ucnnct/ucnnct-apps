package cc.uconnect.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "minio")
public class MinioProperties {
    private String endpoint;
    private String accessKey;
    private String secretKey;
    private String bucket;
    private String publicUrl;
    private int presignedUploadExpirySeconds = 900;
    private int presignedDownloadExpirySeconds = 900;
    private long maxUploadSizeBytes = 25L * 1024L * 1024L;
    private List<String> allowedMimeTypes = new ArrayList<>();
}
