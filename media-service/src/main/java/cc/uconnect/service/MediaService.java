package cc.uconnect.service;

import cc.uconnect.config.MinioProperties;
import cc.uconnect.dto.UploadResponse;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class MediaService {

    private final MinioClient minioClient;
    private final MinioProperties minioProperties;

    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"
    );

    public UploadResponse upload(MultipartFile file, String folder, String ownerId) {
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            log.warn("Upload rejected — unsupported content type='{}' ownerId={}", contentType, ownerId);
            throw new IllegalArgumentException("Type de fichier non supporté : " + contentType);
        }

        String filename = file.getOriginalFilename();
        if (filename == null || filename.isBlank()) {
            filename = "upload";
        }

        String key = folder + "/" + ownerId + "/" + UUID.randomUUID() + "-" + filename;

        try {
            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(minioProperties.getBucket())
                    .object(key)
                    .stream(file.getInputStream(), file.getSize(), -1)
                    .contentType(contentType)
                    .build());
        } catch (Exception e) {
            log.error("Upload to MinIO failed key={} ownerId={}", key, ownerId, e);
            throw new RuntimeException("Erreur lors de l'upload vers MinIO", e);
        }

        String url = minioProperties.getPublicUrl() + "/" + minioProperties.getBucket() + "/" + key;
        log.info("File uploaded key={} ownerId={}", key, ownerId);
        return new UploadResponse(url, key);
    }

    public void delete(String key, String ownerId) {
        if (!key.contains(ownerId)) {
            log.warn("Delete rejected — not owner key={} ownerId={}", key, ownerId);
            throw new SecurityException("Vous ne pouvez supprimer que vos propres fichiers");
        }

        try {
            minioClient.removeObject(RemoveObjectArgs.builder()
                    .bucket(minioProperties.getBucket())
                    .object(key)
                    .build());
            log.info("File deleted key={} ownerId={}", key, ownerId);
        } catch (Exception e) {
            log.error("Delete from MinIO failed key={}", key, e);
            throw new RuntimeException("Erreur lors de la suppression sur MinIO", e);
        }
    }
}
