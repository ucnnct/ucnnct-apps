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

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
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
            throw new RuntimeException("Error while uploading file to MinIO", e);
        }

        String url = minioProperties.getPublicUrl() + "/" + minioProperties.getBucket() + "/" + key;
        log.info("Uploaded file: {} -> {}", key, url);
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
            log.debug("Prepared download URL for requesterUserId={} objectKey={}", requesterUserId, objectKey);
            return new PrepareDownloadResponse(objectKey, presignedGetUrl, expires);
        } catch (Exception ex) {
            throw new RuntimeException("Error while preparing download URL", ex);
        }
    }

    public void delete(String key, String ownerId) {
        if (!key.contains(ownerId)) {
            throw new SecurityException("Only owner can delete this object");
        }

        try {
            minioClient.removeObject(RemoveObjectArgs.builder()
                    .bucket(minioProperties.getBucket())
                    .object(key)
                    .build());
            log.info("Deleted file: {}", key);
        } catch (Exception e) {
            throw new RuntimeException("Error while deleting object from MinIO", e);
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
}
