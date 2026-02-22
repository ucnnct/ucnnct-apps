package cc.uconnect.service;

import cc.uconnect.config.MinioProperties;
import cc.uconnect.dto.PrepareDownloadRequest;
import cc.uconnect.dto.PrepareDownloadResponse;
import cc.uconnect.dto.PrepareUploadRequest;
import cc.uconnect.dto.PrepareUploadResponse;
import cc.uconnect.dto.UploadResponse;
import io.minio.GetPresignedObjectUrlArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import io.minio.http.Method;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.net.URI;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class MediaService {

    private final MinioClient minioClient;
    private final MinioProperties minioProperties;

    private static final Pattern SAFE_FILE_CHARS = Pattern.compile("[^a-zA-Z0-9._-]");
    private static final Pattern SAFE_FOLDER_CHARS = Pattern.compile("^[a-zA-Z0-9/_-]+$");
    private static final DateTimeFormatter DATE_PATH_FORMATTER = DateTimeFormatter.ofPattern("yyyy/MM/dd");

    public UploadResponse upload(MultipartFile file, String folder, String ownerId) {
        String contentType = file.getContentType();
        validateMimeType(contentType);
        validateSize(file.getSize());

        String filename = file.getOriginalFilename();
        if (filename == null || filename.isBlank()) {
            filename = "upload.bin";
        }

        String key = buildObjectKey(sanitizeFolder(folder), ownerId, sanitizeFileName(filename));

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

    public PrepareUploadResponse prepareUpload(PrepareUploadRequest request, String ownerId) {
        if (request == null) {
            throw new IllegalArgumentException("request is required");
        }
        if (request.getFileName() == null || request.getFileName().isBlank()) {
            throw new IllegalArgumentException("fileName is required");
        }
        if (request.getSize() == null) {
            throw new IllegalArgumentException("size is required");
        }
        if (request.getSize() < 0L) {
            throw new IllegalArgumentException("size must be positive");
        }

        validateMimeType(request.getMimeType());
        validateSize(request.getSize());

        String folder = sanitizeFolder(request.getFolder());
        String fileName = sanitizeFileName(request.getFileName());
        String objectKey = buildObjectKey(folder, ownerId, fileName);
        int expires = minioProperties.getPresignedUploadExpirySeconds();

        try {
            String presignedPutUrl = minioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(Method.PUT)
                            .bucket(minioProperties.getBucket())
                            .object(objectKey)
                            .expiry(expires)
                            .build());
            return new PrepareUploadResponse(objectKey, presignedPutUrl, expires);
        } catch (Exception ex) {
            throw new RuntimeException("Error while preparing upload URL", ex);
        }
    }

    public PrepareDownloadResponse prepareDownload(PrepareDownloadRequest request, String requesterUserId) {
        if (request == null || request.getObjectKey() == null || request.getObjectKey().isBlank()) {
            throw new IllegalArgumentException("objectKey is required");
        }

        String objectKey = request.getObjectKey().trim();
        int expires = minioProperties.getPresignedDownloadExpirySeconds();

        try {
            String presignedGetUrl = minioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(Method.GET)
                            .bucket(minioProperties.getBucket())
                            .object(objectKey)
                            .expiry(expires)
                            .build());
            String resolvedDownloadUrl = resolveDownloadUrl(presignedGetUrl, objectKey);
            log.debug("Prepared download URL for requesterUserId={} objectKey={}", requesterUserId, objectKey);
            return new PrepareDownloadResponse(objectKey, resolvedDownloadUrl, expires);
        } catch (Exception ex) {
            throw new RuntimeException("Error while preparing download URL", ex);
        }
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

    private void validateMimeType(String mimeType) {
        if (mimeType == null || mimeType.isBlank()) {
            throw new IllegalArgumentException("mimeType is required");
        }

        List<String> allowedMimeTypes = minioProperties.getAllowedMimeTypes();
        if (allowedMimeTypes == null || allowedMimeTypes.isEmpty()) {
            return;
        }

        if (!allowedMimeTypes.contains(mimeType)) {
            throw new IllegalArgumentException("Unsupported file type: " + mimeType);
        }
    }

    private void validateSize(long size) {
        if (size <= 0L) {
            throw new IllegalArgumentException("File size must be positive");
        }

        if (size > minioProperties.getMaxUploadSizeBytes()) {
            throw new IllegalArgumentException("File too large");
        }
    }

    private String buildObjectKey(String folder, String ownerId, String fileName) {
        String datePath = LocalDate.now(ZoneOffset.UTC).format(DATE_PATH_FORMATTER);
        return folder + "/" + ownerId + "/" + datePath + "/" + UUID.randomUUID() + "-" + fileName;
    }

    private String sanitizeFolder(String folder) {
        String candidate = folder == null || folder.isBlank() ? "chat" : folder.trim();
        candidate = candidate.replace("\\", "/");

        while (candidate.startsWith("/")) {
            candidate = candidate.substring(1);
        }
        while (candidate.endsWith("/")) {
            candidate = candidate.substring(0, candidate.length() - 1);
        }

        if (candidate.isBlank()) {
            candidate = "chat";
        }

        if (candidate.contains("..")) {
            throw new IllegalArgumentException("Invalid folder");
        }

        if (!SAFE_FOLDER_CHARS.matcher(candidate).matches()) {
            throw new IllegalArgumentException("Invalid folder");
        }

        return candidate;
    }

    private String sanitizeFileName(String fileName) {
        String normalized = fileName.replace("\\", "/");
        int slashIndex = normalized.lastIndexOf('/');
        if (slashIndex >= 0) {
            normalized = normalized.substring(slashIndex + 1);
        }

        normalized = SAFE_FILE_CHARS.matcher(normalized).replaceAll("_");
        if (normalized.isBlank()) {
            normalized = "file.bin";
        }

        if (normalized.length() > 120) {
            normalized = normalized.substring(normalized.length() - 120);
        }

        return normalized;
    }

    private String resolveDownloadUrl(String presignedGetUrl, String objectKey) {
        String host = extractHost(presignedGetUrl);
        if (host != null && isInternalHost(host)) {
            String publicUrl = buildPublicObjectUrl(objectKey);
            log.debug("Switching to public media URL because presigned host is internal host={} objectKey={}",
                    host,
                    objectKey);
            return publicUrl;
        }
        return presignedGetUrl;
    }

    private String extractHost(String url) {
        try {
            URI uri = URI.create(url);
            return uri.getHost();
        } catch (Exception ex) {
            return null;
        }
    }

    private String buildPublicObjectUrl(String objectKey) {
        String base = minioProperties.getPublicUrl() == null ? "" : minioProperties.getPublicUrl().trim();
        while (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        return base + "/" + minioProperties.getBucket() + "/" + objectKey;
    }

    private boolean isInternalHost(String hostname) {
        if (hostname == null || hostname.isBlank()) {
            return true;
        }

        String normalized = hostname.trim().toLowerCase(Locale.ROOT);
        if ("localhost".equals(normalized)
                || "minio".equals(normalized)
                || normalized.endsWith(".local")
                || normalized.endsWith(".internal")
                || normalized.endsWith(".svc")
                || normalized.contains(".svc.cluster.local")) {
            return true;
        }

        return isPrivateIpv4Address(normalized);
    }

    private boolean isPrivateIpv4Address(String host) {
        String[] parts = host.split("\\.");
        if (parts.length != 4) {
            return false;
        }

        int[] octets = new int[4];
        for (int i = 0; i < parts.length; i++) {
            try {
                octets[i] = Integer.parseInt(parts[i]);
            } catch (NumberFormatException ex) {
                return false;
            }
            if (octets[i] < 0 || octets[i] > 255) {
                return false;
            }
        }

        int first = octets[0];
        int second = octets[1];
        return first == 10
                || first == 127
                || (first == 172 && second >= 16 && second <= 31)
                || (first == 192 && second == 168)
                || (first == 169 && second == 254);
    }
}
