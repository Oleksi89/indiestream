package com.indiestream.media.service;

import com.indiestream.media.MediaModuleApi;
import com.indiestream.media.TrackMetadata;
import com.indiestream.media.TrackUploadedEvent;
import com.indiestream.media.domain.Track;
import com.indiestream.media.domain.TrackStatus;
import com.indiestream.media.dto.TrackDto;
import com.indiestream.media.repository.TrackRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.core.io.InputStreamResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TrackService implements MediaModuleApi {

    private final TrackRepository trackRepository;
    private final MinioStorageService minioStorageService;
    private final ApplicationEventPublisher events;


    /**
     * Orchestrates the upload of a master track, optional cover, and dynamic stems.
     * Ensures atomic database saving after all MinIO uploads succeed.
     */
    @Transactional
    public TrackDto uploadTrack(UUID artistId, String title, MultipartFile file, MultipartFile cover, MultipartFile[] stemFiles, List<String> stemNames) {
        String bucketPath = minioStorageService.uploadTrackFile(file, artistId);

        String coverPath = null;
        if (cover != null && !cover.isEmpty()) {
            coverPath = minioStorageService.uploadCoverFile(cover, artistId);
        }

        Map<String, String> stemsMetadata = new HashMap<>();

        // Match stems with their provided metadata names
        if (stemFiles != null && stemNames != null && stemFiles.length == stemNames.size()) {
            for (int i = 0; i < stemFiles.length; i++) {
                if (!stemFiles[i].isEmpty()) {
                    String stemName = stemNames.get(i).trim();
                    String stemPath = minioStorageService.uploadStemFile(stemFiles[i], artistId, stemName);
                    stemsMetadata.put(stemName, stemPath);
                }
            }
        } else if (stemFiles != null || stemNames != null) {
            // TODO: [Media] - Throw custom RFC 7807 Bad Request exception
            throw new IllegalArgumentException("Mismatched stem files and stem names.");
        }

        Track track = Track.builder()
                .artistId(artistId)
                .title(title)
                .minioBucketPath(bucketPath)
                .coverMinioPath(coverPath)
                .stemsMetadata(stemsMetadata)
                .durationSeconds(0)
                .status(TrackStatus.PROCESSING) // Default state
                .build();

        Track savedTrack = trackRepository.save(track);
        events.publishEvent(new TrackUploadedEvent(savedTrack.getId(), savedTrack.getTitle()));

        return mapToDto(savedTrack);
    }

    /**
     * Updates track status autonomously.
     * Requires a new transaction to ensure status is committed even if the caller context fails.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void updateTrackStatus(UUID trackId, TrackStatus status, String hlsManifestPath, Integer durationSeconds) {
        Track track = trackRepository.findById(trackId)
                .orElseThrow(() -> new IllegalArgumentException("Track not found"));

        track.setStatus(status);
        if (hlsManifestPath != null) track.setHlsManifestPath(hlsManifestPath);
        if (durationSeconds != null) track.setDurationSeconds(durationSeconds);

        trackRepository.save(track);
    }

    /**
     * Finds a track by its UUID.
     * // TODO: [Media] - Add custom exception TrackNotFoundException mapped to RFC 7807 404
     */
    @Transactional(readOnly = true)
    public TrackDto getTrackById(UUID trackId) {
        return trackRepository.findById(trackId)
                .map(this::mapToDto)
                .orElseThrow(() -> new IllegalArgumentException("Track not found"));
    }

    /**
     * Retrieves a paginated page of TrackDto objects for a specific artist.
     * * @param artistId The ID of the artist requesting their tracks
     *
     * @param pageable Page request metadata (size, page number)
     */
    @Transactional(readOnly = true)
    public Page<TrackDto> getTracksByArtist(UUID artistId, Pageable pageable) {
        return trackRepository.findAllByArtistIdAndStatusOrderByCreatedAtDesc(artistId, TrackStatus.READY, pageable)
                .map(this::mapToDto);
    }


    /**
     * Retrieves a global paginated feed of all tracks.
     */
    @Transactional(readOnly = true)
    public Page<TrackDto> getPublicTracks(Pageable pageable) {
        return trackRepository.findAllByStatusOrderByCreatedAtDesc(TrackStatus.READY, pageable)
                .map(this::mapToDto);
    }

    /**
     * Retrieves an HLS manifest or segment from storage.
     * Maps the virtual API path to the physical MinIO object path.
     */
    @Transactional(readOnly = true)
    public InputStreamResource getHlsResource(UUID trackId, String relativePath) {
        Track track = trackRepository.findById(trackId)
                .orElseThrow(() -> new IllegalArgumentException("Track not found"));

        // Build the base path used during processing: artists/{id}/hls/{trackId}/
        String hlsBasePath = "artists/" + track.getArtistId() + "/hls/" + track.getId() + "/";
        String objectPath = hlsBasePath + relativePath;

        // Use MinioStorageService to get the full stream without range limits
        return new InputStreamResource(minioStorageService.getObjectStream(objectPath));
    }

    /**
     * Implementation of the public module API.
     * Maps internal entity to a public metadata record.
     */
    @Override
    public TrackMetadata getTrackMetadata(UUID trackId) {
        return trackRepository.findById(trackId)
                .map(t -> new TrackMetadata(
                        t.getId(),
                        t.getTitle(),
                        t.getArtistId(),
                        t.getDurationSeconds(),
                        t.getCoverMinioPath()
                ))
                .orElseThrow(() -> new IllegalArgumentException("Track not found"));
    }

    private TrackDto mapToDto(Track track) {
        return new TrackDto(
                track.getId(),
                track.getArtistId(),
                track.getTitle(),
                track.getMinioBucketPath(),
                track.getCoverMinioPath(),
                track.getStemsMetadata(),
                track.getDurationSeconds(),
                track.getStatus(),
                track.getHlsManifestPath()
        );
    }
}