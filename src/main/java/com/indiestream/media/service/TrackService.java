package com.indiestream.media.service;

import com.indiestream.media.domain.Track;
import com.indiestream.media.dto.TrackDto;
import com.indiestream.media.repository.TrackRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TrackService {

    private final TrackRepository trackRepository;
    private final MinioStorageService minioStorageService;

    /**
     * Orchestrates the upload of a master track file to blob storage
     * and persists the metadata record in the database.
     */
    @Transactional
    public TrackDto uploadMasterTrack(UUID artistId, String title, MultipartFile file) {
        String bucketPath = minioStorageService.uploadTrackFile(file, artistId);

        Track track = Track.builder()
                .artistId(artistId)
                .title(title)
                .minioBucketPath(bucketPath)
                // Initialize with empty stems for the master track upload
                .stemsMetadata(new HashMap<>())
                .durationSeconds(0) // TODO: [Media] - FFmpeg integration to automatically calculate durationSeconds
                .build();

        Track savedTrack = trackRepository.save(track);
        return mapToDto(savedTrack);
    }

    private TrackDto mapToDto(Track track) {
        return new TrackDto(
                track.getId(),
                track.getArtistId(),
                track.getTitle(),
                track.getMinioBucketPath(),
                track.getStemsMetadata(),
                track.getDurationSeconds()
        );
    }
}