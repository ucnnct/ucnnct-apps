package cc.uconnect.controller;

import cc.uconnect.dto.UploadResponse;
import cc.uconnect.service.MediaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/media")
@RequiredArgsConstructor
public class MediaController {

    private final MediaService mediaService;

    @PostMapping("/upload")
    public ResponseEntity<UploadResponse> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "folder", defaultValue = "uploads") String folder,
            JwtAuthenticationToken auth) {

        String userId = auth.getToken().getSubject();
        UploadResponse response = mediaService.upload(file, folder, userId);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping
    public ResponseEntity<Void> delete(
            @RequestParam("key") String key,
            JwtAuthenticationToken auth) {

        String userId = auth.getToken().getSubject();
        mediaService.delete(key, userId);
        return ResponseEntity.noContent().build();
    }
}
