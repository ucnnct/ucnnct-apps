package cc.uconnect.controller;

import cc.uconnect.dto.PrepareDownloadRequest;
import cc.uconnect.dto.PrepareDownloadResponse;
import cc.uconnect.dto.PrepareUploadRequest;
import cc.uconnect.dto.PrepareUploadResponse;
import cc.uconnect.service.MediaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/media")
@RequiredArgsConstructor
public class MediaPrepareController {

    private final MediaService mediaService;

    @PostMapping("/uploads/prepare")
    public ResponseEntity<PrepareUploadResponse> prepareUpload(@RequestBody PrepareUploadRequest request,
                                                               JwtAuthenticationToken auth) {
        String userId = auth.getToken().getSubject();
        return ResponseEntity.ok(mediaService.prepareUpload(request, userId));
    }

    @PostMapping("/downloads/prepare")
    public ResponseEntity<PrepareDownloadResponse> prepareDownload(@RequestBody PrepareDownloadRequest request,
                                                                   JwtAuthenticationToken auth) {
        String userId = auth.getToken().getSubject();
        return ResponseEntity.ok(mediaService.prepareDownload(request, userId));
    }
}
