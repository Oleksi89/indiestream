package com.indiestream.media.controller;

import com.indiestream.media.dto.TrackDto;
import com.indiestream.media.service.MinioStorageService;
import com.indiestream.media.service.TrackService;
import io.minio.StatObjectResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;
import java.util.List;

@RestController
@RequestMapping("/api/v1/tracks")
@RequiredArgsConstructor
public class TrackController {

    private final TrackService trackService;
    private final MinioStorageService minioStorageService;

    /**
     * Uploads a new track. Consumes multipart/form-data
     * // TODO: [Security] - Extract artistId from JWT custom claims instead of RequestParam to prevent spoofing
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<TrackDto> uploadTrack(
            @RequestParam("artistId") UUID artistId,
            @RequestParam("title") String title,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "cover", required = false) MultipartFile cover
    ) {
        TrackDto uploadedTrack = trackService.uploadMasterTrack(artistId, title, file, cover);
        return ResponseEntity.status(HttpStatus.CREATED).body(uploadedTrack);
    }

    /**
     * Retrieves a paginated list of tracks.
     * If artistId is provided, filters by that artist. Otherwise, returns a global public feed.
     */
    @GetMapping
    public ResponseEntity<Page<TrackDto>> getTracks(
            @RequestParam(value = "artistId", required = false) UUID artistId,
            @PageableDefault(size = 10) Pageable pageable
    ) {
        Page<TrackDto> trackPage;
        if (artistId != null) {
            trackPage = trackService.getTracksByArtist(artistId, pageable);
        } else {
            trackPage = trackService.getPublicTracks(pageable);
        }
        return ResponseEntity.ok(trackPage);
    }

    /**
     * Streams audio data supporting HTTP Range requests for seamless playback and seeking.
     */
    @GetMapping(value = "/{trackId}/stream")
    public ResponseEntity<InputStreamResource> streamTrack(
            @PathVariable UUID trackId,
            @RequestHeader(value = "Range", required = false) String rangeHeader
    ) {
        TrackDto track = trackService.getTrackById(trackId);
        StatObjectResponse metadata = minioStorageService.getObjectMetadata(track.minioBucketPath());
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
                minioStorageService.getObjectStream(track.minioBucketPath(), rangeStart, contentLength)
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
    public ResponseEntity<InputStreamResource> getTrackCover(@PathVariable UUID trackId) {
        TrackDto track = trackService.getTrackById(trackId);

        if (track.coverMinioPath() == null) {
            return ResponseEntity.notFound().build();
        }

        StatObjectResponse metadata = minioStorageService.getObjectMetadata(track.coverMinioPath());
        InputStreamResource resource = new InputStreamResource(
                minioStorageService.getObjectStream(track.coverMinioPath(), 0, metadata.size())
        );

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(metadata.contentType()))
                .contentLength(metadata.size())
                .body(resource);
    }

}
