package com.indiestream.media.service;

import com.indiestream.media.TrackUploadedEvent;
import com.indiestream.media.domain.Track;
import com.indiestream.media.dto.TrackDto;
import com.indiestream.media.repository.TrackRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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
    private final ApplicationEventPublisher events;

    public void saveTrack() {
        events.publishEvent(new TrackUploadedEvent(1L, "Synthwave"));
    }

    /**
     * Orchestrates the upload of a master track file and an optional cover image.
     */
    @Transactional
    public TrackDto uploadMasterTrack(UUID artistId, String title, MultipartFile file, MultipartFile cover) {
        String bucketPath = minioStorageService.uploadTrackFile(file, artistId);

        String coverPath = null;
        if (cover != null && !cover.isEmpty()) {
            coverPath = minioStorageService.uploadCoverFile(cover, artistId);
        }

        Track track = Track.builder()
                .artistId(artistId)
                .title(title)
                .minioBucketPath(bucketPath)
                .coverMinioPath(coverPath)
                .stemsMetadata(new HashMap<>())
                .durationSeconds(0)
                .build();

        Track savedTrack = trackRepository.save(track);
        return mapToDto(savedTrack);
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
        return trackRepository.findAllByArtistIdOrderByCreatedAtDesc(artistId, pageable)
                .map(this::mapToDto);
    }


    /**
     * Retrieves a global paginated feed of all tracks.
     */
    @Transactional(readOnly = true)
    public Page<TrackDto> getPublicTracks(Pageable pageable) {
        return trackRepository.findAllByOrderByCreatedAtDesc(pageable)
                .map(this::mapToDto);
    }

    private TrackDto mapToDto(Track track) {
        return new TrackDto(
                track.getId(),
                track.getArtistId(),
                track.getTitle(),
                track.getMinioBucketPath(),
                track.getCoverMinioPath(),
                track.getStemsMetadata(),
                track.getDurationSeconds()
        );
    }
}