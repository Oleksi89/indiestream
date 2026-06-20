package com.indiestream.media.catalog.controller;

import com.indiestream.media.catalog.dto.TrackDto;
import com.indiestream.media.catalog.service.ArtistTrackManagementService;
import com.indiestream.media.storage.service.MinioStorageService;
import com.indiestream.media.catalog.service.TrackService;
import io.minio.StatObjectResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tracks")
@RequiredArgsConstructor
@Validated
public class TrackController {

    private final TrackService trackService;
    private final ArtistTrackManagementService trackManagementService;
    private final MinioStorageService minioStorageService;

    // --- Authentication Helper ---

    /**
     * Lightweight internal record to pass security context cleanly.
     */
    private record AuthContext(UUID requesterId, boolean isAdmin) {
    }

    /**
     * Extracts UUID and Admin status directly from the in-memory JWT Authentication object.
     * Prevents database round-trips for role validation.
     */
    private AuthContext resolveAuthContext(Authentication authentication) {
        if (authentication != null && authentication.isAuthenticated() && !authentication.getPrincipal().equals("anonymousUser")) {
            UUID requesterId = UUID.fromString(authentication.getName());
            boolean isAdmin = authentication.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ADMIN") || a.getAuthority().equals("ROLE_ADMIN"));
            return new AuthContext(requesterId, isAdmin);
        }
        return new AuthContext(null, false);
    }

    // --- Upload & Lifecycle Endpoints ---

    /**
     * Uploads a new track with optional stems and semantic metadata.
     * Extracts artistId directly from the validated JWT Principal to prevent spoofing.
     * Enforces strict regex and size boundaries on custom tags to prevent injection and bloat.
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ARTIST')")
    public ResponseEntity<TrackDto> uploadTrack(
            Principal principal,
            @RequestParam("title") String title,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "cover", required = false) MultipartFile cover,
            @RequestParam(value = "stemFiles", required = false) MultipartFile[] stemFiles,
            @RequestParam(value = "stemNames", required = false) List<String> stemNames,
            @RequestParam(value = "genre", required = false) @Size(max = 100) String genre,
            @RequestParam(value = "isExplicit", defaultValue = "false") boolean isExplicit,
            @RequestParam(value = "customTags", required = false)
            @Size(max = 10, message = "Maximum 10 custom tags allowed")
            Set<@Pattern(regexp = "^[a-z0-9-]+$", message = "Tags must be lowercase alphanumeric") String> customTags
    ) {
        UUID artistId = UUID.fromString(principal.getName());
        TrackDto uploadedTrack = trackService.uploadTrack(
                artistId, title, file, cover, stemFiles, stemNames, genre, isExplicit, customTags
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(uploadedTrack);
    }

    // --- Advanced Artist Workflows (Lifecycle Management) ---

    @PostMapping("/{trackId}/publish")
    @PreAuthorize("hasRole('ARTIST')")
    public ResponseEntity<Void> publishTrack(@PathVariable UUID trackId, Principal principal) {
        UUID artistId = UUID.fromString(principal.getName());
        trackManagementService.publishTrack(trackId, artistId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{trackId}/visibility")
    @PreAuthorize("hasRole('ARTIST')")
    public ResponseEntity<Void> toggleVisibility(@PathVariable UUID trackId, Principal principal) {
        UUID artistId = UUID.fromString(principal.getName());
        trackManagementService.toggleTrackVisibility(trackId, artistId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Maps the RESTful DELETE operation to a secure Soft Delete (ARCHIVED transition) within the FSM.
     * Preserves audit trails and media blobs for compliance and moderation history.
     */
    @DeleteMapping("/{trackId}")
    @PreAuthorize("hasRole('ARTIST')")
    public ResponseEntity<Void> archiveTrack(@PathVariable UUID trackId, Principal principal) {
        UUID artistId = UUID.fromString(principal.getName());
        trackManagementService.archiveTrack(trackId, artistId);
        return ResponseEntity.noContent().build();
    }

    // --- Query & Streaming Endpoints ---

    @GetMapping("/{trackId}")
    public ResponseEntity<TrackDto> getTrackById(
            @PathVariable UUID trackId,
            Authentication authentication
    ) {
        AuthContext auth = resolveAuthContext(authentication);
        TrackDto track = trackService.getTrackById(trackId, auth.requesterId(), auth.isAdmin());
        return ResponseEntity.ok(track);
    }

    /**
     * Retrieves a paginated list of tracks.
     * If artistId is provided, filters by that artist. Otherwise, returns a global public feed.
     */
    @GetMapping
    public ResponseEntity<Page<TrackDto>> getTracks(
            @RequestParam(value = "artistId", required = false) UUID artistId,
            @PageableDefault(size = 10) Pageable pageable,
            Principal principal
    ) {
        UUID currentUserId = principal != null ? UUID.fromString(principal.getName()) : null;
        Page<TrackDto> trackPage;
        if (artistId != null) {
            trackPage = trackService.getTracksByArtist(artistId, currentUserId, pageable);
        } else {
            trackPage = trackService.getPublicTracks(pageable);
        }
        return ResponseEntity.ok(trackPage);
    }

    /**
     * Dedicated endpoint for the Artist Studio Dashboard.
     * Returns all tracks belonging to the authenticated artist regardless of their FSM status.
     */
    @GetMapping("/studio")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<TrackDto>> getStudioTracks(
            @PageableDefault(size = 20) Pageable pageable,
            Principal principal
    ) {
        UUID artistId = UUID.fromString(principal.getName());
        return ResponseEntity.ok(trackService.getStudioTracks(artistId, pageable));
    }

    // --- Secure Media Serving ---

    /**
     * Proxy for HLS resources (manifests and segments).
     * Secures media behind JWT instead of exposing MinIO buckets.
     */
    @GetMapping("/{trackId}/hls/**")
    public ResponseEntity<Resource> getHlsResource(
            @PathVariable UUID trackId,
            HttpServletRequest request,
            Authentication authentication
    ) {
        // Throws exception if user is not authorized to view this track
        AuthContext auth = resolveAuthContext(authentication);
        trackService.getTrackById(trackId, auth.requesterId(), auth.isAdmin());

        // Fetch Blob
        String requestUri = request.getRequestURI();
        String path = requestUri.substring(requestUri.indexOf("/hls/") + 5);

        InputStreamResource resource = trackService.getHlsResource(trackId, path);

        String contentType = path.endsWith(".m3u8") ? "application/vnd.apple.mpegurl" :
                path.endsWith(".ts") ? "video/MP2T" : "application/octet-stream";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, contentType)
                // caching for tracks, cache segments aggressively for 1 year
                .header(HttpHeaders.CACHE_CONTROL, path.endsWith(".m3u8") ? "no-cache" : "max-age=31536000")
                .body(resource);
    }

    /**
     * Streams audio data supporting HTTP Range requests for seamless playback and seeking.
     */
    @GetMapping(value = "/{trackId}/stream")
    public ResponseEntity<InputStreamResource> streamTrack(
            @PathVariable UUID trackId,
            @RequestHeader(value = "Range", required = false) String rangeHeader,
            Authentication authentication
    ) {
        AuthContext auth = resolveAuthContext(authentication);
        // Security check embedded inside the DTO fetch
        TrackDto track = trackService.getTrackById(trackId, auth.requesterId(), auth.isAdmin());
        return buildStreamResponse(track.minioBucketPath(), rangeHeader);
    }

    /**
     * Resolves and streams a specific stem belonging to a track.
     * Range requests are supported to allow client-side buffering optimizations.
     */
    @GetMapping(value = "/{trackId}/stems/{stemName}")
    public ResponseEntity<InputStreamResource> streamStem(
            @PathVariable UUID trackId,
            @PathVariable String stemName,
            @RequestHeader(value = "Range", required = false) String rangeHeader,
            Authentication authentication
    ) {
        AuthContext auth = resolveAuthContext(authentication);
        TrackDto track = trackService.getTrackById(trackId, auth.requesterId(), auth.isAdmin());

        String stemPath = track.stemsMetadata().get(stemName);

        if (stemPath == null) {
            return ResponseEntity.notFound().build();
        }

        return buildStreamResponse(stemPath, rangeHeader);
    }

    /**
     * Centralizes HTTP 206 Partial Content resolution for media objects.
     * Ensures consistent media delivery behavior across both master tracks and dynamic stems.
     */
    private ResponseEntity<InputStreamResource> buildStreamResponse(String objectPath, String rangeHeader) {
        StatObjectResponse metadata = minioStorageService.getObjectMetadata(objectPath);
        long fileSize = metadata.size();

        // Default to full file if no Range header is provided
        long rangeStart = 0;
        long rangeEnd = fileSize - 1;

        if (rangeHeader != null && rangeHeader.startsWith("bytes=")) {
            String[] ranges = rangeHeader.substring(6).split("-");
            try {
                rangeStart = Long.parseLong(ranges[0]);
                if (ranges.length > 1 && !ranges[1].isEmpty()) {
                    rangeEnd = Long.parseLong(ranges[1]);
                }
            } catch (NumberFormatException e) {
                return ResponseEntity.status(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE).build();
            }
        }

        // Sanity check
        if (rangeStart > fileSize - 1) {
            return ResponseEntity.status(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE).build();
        }

        long contentLength = rangeEnd - rangeStart + 1;
        InputStreamResource resource = new InputStreamResource(
                minioStorageService.getObjectStream(objectPath)
        );

        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.CONTENT_TYPE, metadata.contentType());
        headers.add(HttpHeaders.ACCEPT_RANGES, "bytes");
        headers.add(HttpHeaders.CONTENT_LENGTH, String.valueOf(contentLength));
        headers.add(HttpHeaders.CONTENT_RANGE, "bytes " + rangeStart + "-" + rangeEnd + "/" + fileSize);

        HttpStatus status = (rangeHeader != null) ? HttpStatus.PARTIAL_CONTENT : HttpStatus.OK;

        return ResponseEntity.status(status)
                .headers(headers)
                .body(resource);
    }

    /**
     * Proxies the cover image from MinIO to the frontend.
     * Allows the frontend to render <img src="/api/v1/tracks/{id}/cover"> without exposing MinIO credentials or making the bucket entirely public.
     */
    @GetMapping(value = "/{trackId}/cover")
    public ResponseEntity<InputStreamResource> getTrackCover(
            @PathVariable UUID trackId,
            Authentication authentication
    ) {
        AuthContext auth = resolveAuthContext(authentication);
        TrackDto track = trackService.getTrackById(trackId, auth.requesterId(), auth.isAdmin());

        if (track.coverMinioPath() == null) {
            return ResponseEntity.notFound().build();
        }

        StatObjectResponse metadata = minioStorageService.getObjectMetadata(track.coverMinioPath());
        InputStreamResource resource = new InputStreamResource(
                minioStorageService.getObjectStream(track.coverMinioPath())
        );

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(metadata.contentType()))
                .contentLength(metadata.size())
                .body(resource);
    }
}