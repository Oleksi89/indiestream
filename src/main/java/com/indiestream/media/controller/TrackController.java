package com.indiestream.media.controller;

import com.indiestream.media.dto.TrackDto;
import com.indiestream.media.service.TrackService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tracks")
@RequiredArgsConstructor
public class TrackController {

    private final TrackService trackService;

    /**
     * Uploads a new track. Consumes multipart/form-data
     * // TODO: [Security] - Extract artistId from JWT custom claims instead of RequestParam to prevent spoofing
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<TrackDto> uploadTrack(
            @RequestParam("artistId") UUID artistId,
            @RequestParam("title") String title,
            @RequestParam("file") MultipartFile file
    ) {
        TrackDto uploadedTrack = trackService.uploadMasterTrack(artistId, title, file);
        return ResponseEntity.status(HttpStatus.CREATED).body(uploadedTrack);
    }
}