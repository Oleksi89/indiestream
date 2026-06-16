package com.indiestream.media.catalog.service;

import com.indiestream.auth.AuthModuleApi;
import com.indiestream.auth.UserPublicProfile;
import com.indiestream.media.api.MediaModuleApi;
import com.indiestream.media.api.TrackMetadata;
import com.indiestream.media.api.TrackUploadedEvent;
import com.indiestream.media.catalog.domain.Track;
import com.indiestream.media.catalog.domain.TrackStatus;
import com.indiestream.media.catalog.domain.TrackTags;
import com.indiestream.media.catalog.dto.TrackDto;
import com.indiestream.media.catalog.dto.TrackTagsDto;
import com.indiestream.media.catalog.repository.TrackRepository;
import com.indiestream.media.storage.service.MinioStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.core.io.InputStreamResource;
import org.springframework.data.domain.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TrackService implements MediaModuleApi {

    private final TrackRepository trackRepository;
    private final MinioStorageService minioStorageService;
    private final ApplicationEventPublisher events;

    // Cross-module strict API dependency
    private final AuthModuleApi authModuleApi;

    // Strict validation set matching the frontend
    public static final Set<String> ALLOWED_GENRES = Set.of(
            "Alternative", "Ambient", "Blues", "Classical", "Country",
            "Dance", "Electronic", "Folk", "Hip Hop", "Indie",
            "Jazz", "Latin", "Metal", "Pop", "Punk",
            "R&B", "Reggae", "Rock", "Soul", "Soundtrack",
            "Synthwave", "Techno", "Trance", "World", "Other"
    );

    /**
     * Orchestrates the upload of a master track, optional cover, stems, and semantic metadata.
     * Ensures atomic database saving after all MinIO uploads succeed.
     */
    @Transactional
    public TrackDto uploadTrack(UUID artistId, String title, MultipartFile file, MultipartFile cover,
                                MultipartFile[] stemFiles, List<String> stemNames,
                                String genre, boolean isExplicit, Set<String> customTags) {

        // Strict Backend Validation
        if (genre != null && !genre.isBlank() && !ALLOWED_GENRES.contains(genre)) {
            throw new IllegalArgumentException("Invalid or unsupported genre provided.");
        }

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

        // Initialize tags; moods and aiGenerated are left empty for future pipeline ingestion
        TrackTags tags = new TrackTags(customTags, null, null);

        Track track = Track.builder()
                .artistId(artistId)
                .title(title)
                .minioBucketPath(bucketPath)
                .coverMinioPath(coverPath)
                .stemsMetadata(stemsMetadata)
                .durationSeconds(0)
                .status(TrackStatus.PROCESSING) // Default state
                .genre(genre)
                .isExplicit(isExplicit)
                .tags(tags)
                .build();

        Track savedTrack = trackRepository.save(track);
        events.publishEvent(new TrackUploadedEvent(savedTrack.getId(), savedTrack.getTitle()));

        return mapToDto(savedTrack);
    }


    /**
     * Updates technical media paths without modifying the FSM status.
     * Requires a new transaction to commit technical parsing success regardless of downstream FSM failures.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void updateTrackMediaMetadata(UUID trackId, String hlsManifestPath, Integer durationSeconds) {
        Track track = trackRepository.findById(trackId)
                .orElseThrow(() -> new IllegalArgumentException("Track not found"));

        if (hlsManifestPath != null) track.setHlsManifestPath(hlsManifestPath);
        if (durationSeconds != null) track.setDurationSeconds(durationSeconds);

        trackRepository.save(track);
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
     * Finds a track by its UUID with strict Role-Based and FSM-Based Access Control.
     * Prevents IDOR vulnerabilities by simulating a 404 Not Found for unauthorized states.
     * // TODO: [Media] - Add custom exception TrackNotFoundException mapped to RFC 7807 404
     */
    @Transactional(readOnly = true)
    public TrackDto getTrackById(UUID trackId, UUID requesterId, boolean isAdmin) {
        Track track = trackRepository.findById(trackId)
                .orElseThrow(() -> new IllegalArgumentException("Track not found"));

        // Admins have omnipotent read access for moderation purposes
        if (isAdmin) {
            return mapToDto(track);
        }

        boolean isOwner = track.getArtistId().equals(requesterId);

        // Owners can see their tracks in any FSM state EXCEPT Soft Deleted (ARCHIVED)
        if (isOwner) {
            if (track.getStatus() == TrackStatus.ARCHIVED) {
                throw new IllegalArgumentException("Track not found");
            }
            return mapToDto(track);
        }

        // Anyone else can ONLY see PUBLISHED tracks
        if (track.getStatus() != TrackStatus.PUBLISHED) {
            throw new IllegalArgumentException("Track not found");
        }

        return mapToDto(track);
    }

    /**
     * Retrieves a paginated page of TrackDto objects for a specific artist.
     * * @param artistId The ID of the artist requesting their tracks
     *
     * @param artistId The ID of the artist requesting their tracks
     * @param pageable Page request metadata (size, page number)
     */
    @Transactional(readOnly = true)
    public Page<TrackDto> getTracksByArtist(UUID artistId, UUID currentUserId, Pageable pageable) {
        if (!authModuleApi.isProfileAccessible(artistId, currentUserId)) {
            throw new AccessDeniedException("This profile is private.");
        }
        return trackRepository.findAllByArtistIdAndStatusOrderByCreatedAtDesc(artistId, TrackStatus.PUBLISHED, pageable)
                .map(this::mapToDto);
    }

    @Transactional(readOnly = true)
    public Page<TrackDto> getStudioTracks(UUID artistId, Pageable pageable) {
        return trackRepository.findAllStudioTracksExcludingArchived(artistId, pageable)
                .map(this::mapToDto);
    }

    /**
     * Retrieves a global paginated feed of all tracks.
     */
    @Transactional(readOnly = true)
    public Page<TrackDto> getPublicTracks(Pageable pageable) {
        return trackRepository.findAllByStatusOrderByCreatedAtDesc(TrackStatus.PUBLISHED, pageable)
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
     * Projects the internal entity to a public metadata record, resolving cross-module artist identity.
     */
    @Override
    @Transactional(readOnly = true)
    public TrackMetadata getTrackMetadata(UUID trackId) {
        Track track = trackRepository.findById(trackId)
                .orElseThrow(() -> new IllegalArgumentException("Track not found"));

        var profile = authModuleApi.getUserPublicProfile(track.getArtistId()).orElse(null);
        String username = profile != null ? profile.username() : "unknown";
        String alias = profile != null ? profile.alias() : "Unknown Artist";

        return new TrackMetadata(
                track.getId(),
                track.getTitle(),
                track.getArtistId(),
                username,
                alias,
                track.getDurationSeconds(),
                track.getStemsMetadata(),
                track.getCoverMinioPath(),
                track.getGenre(),
                track.isExplicit(),
                track.getTags() != null ? track.getTags().custom() : Set.of(),
                track.getTags() != null ? track.getTags().aiGenerated() : Set.of(),
                track.getStatus().name()
        );
    }

    /**
     * Implementation of the public module API for batch resolution.
     * Optimizes database I/O and minimizes heap allocations by mapping profiles into a single lookup table.
     */
    @Override
    @Transactional(readOnly = true)
    public List<TrackMetadata> getPublicTracksMetadata(List<UUID> trackIds) {
        if (trackIds == null || trackIds.isEmpty()) return Collections.emptyList();

        List<Track> tracks = trackRepository.findByIdInAndStatus(trackIds, TrackStatus.PUBLISHED);
        if (tracks.isEmpty()) return Collections.emptyList();

        // Cross-module batch fetch to prevent N+1 DB calls
        Set<UUID> artistIds = tracks.stream().map(Track::getArtistId).collect(Collectors.toSet());

        // Single optimized map for fast in-memory O(1) lookups
        Map<UUID, com.indiestream.auth.UserPublicProfile> profileMap = authModuleApi.getPublicProfiles(artistIds)
                .stream()
                .collect(Collectors.toMap(com.indiestream.auth.UserPublicProfile::id, p -> p));

        Map<UUID, TrackMetadata> metadataMap = tracks.stream()
                .collect(Collectors.toMap(Track::getId, t -> {
                    var profile = profileMap.get(t.getArtistId());
                    return new TrackMetadata(
                            t.getId(),
                            t.getTitle(),
                            t.getArtistId(),
                            profile != null ? profile.username() : "unknown",
                            profile != null ? profile.alias() : "Unknown Artist",
                            t.getDurationSeconds(),
                            t.getStemsMetadata(),
                            t.getCoverMinioPath(),
                            t.getGenre(),
                            t.isExplicit(),
                            t.getTags() != null ? t.getTags().custom() : Set.of(),
                            t.getTags() != null ? t.getTags().aiGenerated() : Set.of(),
                            t.getStatus().name()
                    );
                }));

        // Reconstruct the list honoring the original ID sequence (AI vector proximity order)
        return trackIds.stream()
                .map(metadataMap::get)
                .filter(Objects::nonNull)
                .toList();
    }

    /**
     * Cross-module unified search engine.
     * Extracts pagination metadata to bypass Hibernate translation constraints.
     * Fully hydrates the TrackMetadata records with Auth identity in a single O(1) batch pass.
     */
    @Override
    @Transactional(readOnly = true)
    public Page<TrackMetadata> searchPublicTracks(String query, String genre, String tagsCsv, Pageable pageable) {
        int limit = pageable.getPageSize();
        int offset = (int) pageable.getOffset();

        // 1. Fetch raw physical entities
        List<Track> tracks = trackRepository.searchTracksUnifiedNative(
                query,
                genre,
                tagsCsv,
                TrackStatus.PUBLISHED.name(),
                limit,
                offset
        );

        if (tracks.isEmpty()) {
            return new PageImpl<>(Collections.emptyList(), pageable, 0);
        }

        // 2. Cross-module batch fetch to guarantee O(1) Auth resolution
        Set<UUID> artistIds = tracks.stream().map(Track::getArtistId).collect(Collectors.toSet());
        Map<UUID, com.indiestream.auth.UserPublicProfile> profileMap = authModuleApi.getPublicProfiles(artistIds)
                .stream()
                .collect(Collectors.toMap(com.indiestream.auth.UserPublicProfile::id, p -> p));

        // 3. Hydrate DTOs
        List<TrackMetadata> metadataList = tracks.stream()
                .map(t -> {
                    var profile = profileMap.get(t.getArtistId());
                    return new TrackMetadata(
                            t.getId(),
                            t.getTitle(),
                            t.getArtistId(),
                            profile != null ? profile.username() : "unknown",
                            profile != null ? profile.alias() : "Unknown Artist",
                            t.getDurationSeconds(),
                            t.getStemsMetadata(),
                            t.getCoverMinioPath(),
                            t.getGenre(),
                            t.isExplicit(),
                            t.getTags() != null ? t.getTags().custom() : Set.of(),
                            t.getTags() != null ? t.getTags().aiGenerated() : Set.of(),
                            t.getStatus().name()
                    );
                })
                .toList();

        return new PageImpl<>(metadataList, pageable, metadataList.size());
    }

    private TrackDto mapToDto(Track track) {
        Optional<UserPublicProfile> profile = authModuleApi.getUserPublicProfile(track.getArtistId());
        String artistAlias = profile.map(UserPublicProfile::alias).orElse("Unknown Artist");
        String artistUsername = profile.map(UserPublicProfile::username).orElse("unknown");

        TrackTags domainTags = track.getTags();
        TrackTagsDto tagsDto = new TrackTagsDto(
                domainTags != null ? domainTags.custom() : Set.of(),
                domainTags != null ? domainTags.moods() : Set.of(),
                domainTags != null ? domainTags.aiGenerated() : Set.of()
        );

        return new TrackDto(
                track.getId(),
                track.getArtistId(),
                artistUsername,
                artistAlias,
                track.getTitle(),
                track.getMinioBucketPath(),
                track.getCoverMinioPath(),
                track.getStemsMetadata(),
                track.getDurationSeconds(),
                track.getStatus(),
                track.getHlsManifestPath(),
                track.getGenre(),
                track.isExplicit(),
                tagsDto,
                track.getCreatedAt()
        );
    }
}