package com.indiestream.media;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import com.indiestream.IntegrationTestBase;
import com.indiestream.auth.dto.RegisterRequestDto;
import com.indiestream.auth.service.UserService;
import com.indiestream.media.catalog.domain.Track;
import com.indiestream.media.catalog.domain.TrackStatus;
import com.indiestream.media.catalog.repository.TrackRepository;
import com.indiestream.media.moderation.service.TrackTransitionEngine;
import com.indiestream.media.storage.service.MinioStorageService;
import io.minio.StatObjectResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.io.ByteArrayInputStream;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Comprehensive integration tests for the Media Module (Track Catalog).
 * Covers Multipart Uploads, FSM Visibility Guards, and HTTP 206 Streaming.
 */
@AutoConfigureMockMvc
class TrackIntegrationTest extends IntegrationTestBase {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private TrackRepository trackRepository;

    @Autowired
    private UserService userService; // For satisfying Database FK constraints

    // Isolate infrastructure and external pipelines
    @MockitoBean
    private MinioStorageService minioStorageService;

    @MockitoBean
    private TrackTransitionEngine trackTransitionEngine;

    private UUID artistId;
    private UUID listenerId;

    @BeforeEach
    void setUp() {
        // Generate unique identities to avoid parallel test execution conflicts
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        artistId = userService.register(new RegisterRequestDto("artist_" + suffix + "@test.com", "artist_" + suffix, "Artist", "password123", "ARTIST")).id();
        listenerId = userService.register(new RegisterRequestDto("listener_" + suffix + "@test.com", "listener_" + suffix, "Listener", "password123", "USER")).id();
    }

    @AfterEach
    void tearDown() {
        trackRepository.deleteAll();
    }

    @Test
    @DisplayName("Upload: Should successfully parse Multipart request and initialize FSM in PROCESSING state")
    void shouldUploadTrackSuccessfully() throws Exception {
        // Mock MinIO successful uploads
        when(minioStorageService.uploadTrackFile(any(), any())).thenReturn("artists/test/audio.mp3");
        when(minioStorageService.uploadCoverFile(any(), any())).thenReturn("artists/test/cover.jpg");

        MockMultipartFile audioFile = new MockMultipartFile("file", "master.mp3", "audio/mpeg", "dummy-audio-bytes".getBytes());
        MockMultipartFile coverFile = new MockMultipartFile("cover", "cover.jpg", "image/jpeg", "dummy-image-bytes".getBytes());

        mockMvc.perform(multipart("/api/v1/tracks")
                        .file(audioFile)
                        .file(coverFile)
                        .param("title", "Neon Nights")
                        .param("genre", "Synthwave")
                        .param("isExplicit", "false")
                        .param("customTags", "retro", "bass")
                        .with(user(artistId.toString()).roles("ARTIST")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Neon Nights"))
                .andExpect(jsonPath("$.status").value(TrackStatus.PROCESSING.name()))
                .andExpect(jsonPath("$.artistId").value(artistId.toString()));
    }

    @Test
    @DisplayName("Upload Guard: Should reject unsupported genres via exact match validation")
    void shouldRejectUploadWithInvalidGenre() throws Exception {
        MockMultipartFile audioFile = new MockMultipartFile("file", "master.mp3", "audio/mpeg", "dummy-bytes".getBytes());

        mockMvc.perform(multipart("/api/v1/tracks")
                        .file(audioFile)
                        .param("title", "Bad Genre Track")
                        .param("genre", "Polka-Hardcore") // Not in ALLOWED_GENRES
                        .with(user(artistId.toString()).roles("ARTIST")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("Bad Request"))
                .andExpect(jsonPath("$.detail").value("Invalid or unsupported genre provided."));
    }

    @Test
    @DisplayName("FSM Security: Enforce Strict Visibility Rules (IDOR Prevention)")
    void shouldEnforceFsmVisibilityGuards() throws Exception {
        // 1. Create a track explicitly in PROCESSING state
        Track processingTrack = Track.builder()
                .artistId(artistId)
                .title("Unreleased Demo")
                .status(TrackStatus.PROCESSING)
                .minioBucketPath("dummy/path.mp3")
                .durationSeconds(0)
                .build();
        trackRepository.save(processingTrack);

        // 2. Artist (Owner) requests track -> 200 OK
        mockMvc.perform(get("/api/v1/tracks/" + processingTrack.getId())
                        .with(user(artistId.toString())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Unreleased Demo"));

        // 3. Listener (Stranger) requests PROCESSING track -> 400 Bad Request (Simulating Not Found to prevent data leakage)
        mockMvc.perform(get("/api/v1/tracks/" + processingTrack.getId())
                        .with(user(listenerId.toString())))
                .andExpect(status().isBadRequest()) // Handled by GlobalExceptionHandler for IllegalArgumentException
                .andExpect(jsonPath("$.detail").value("Track not found"));

        // 4. Promote track to PUBLISHED
        processingTrack.setStatus(TrackStatus.PUBLISHED);
        trackRepository.save(processingTrack);

        // 5. Listener (Stranger) requests PUBLISHED track -> 200 OK
        mockMvc.perform(get("/api/v1/tracks/" + processingTrack.getId())
                        .with(user(listenerId.toString())))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Streaming Engine: Should support HTTP 206 Partial Content via Range headers")
    void shouldStreamTrackWithPartialContent() throws Exception {
        // 1. Seed a published track
        Track track = Track.builder()
                .artistId(artistId)
                .title("Streaming Test")
                .minioBucketPath("dummy/path.mp3")
                .status(TrackStatus.PUBLISHED)
                .build();
        trackRepository.save(track);

        // 2. Mock MinIO metadata and byte streams to simulate a 1000-byte file
        StatObjectResponse mockStat = mock(StatObjectResponse.class);
        when(mockStat.size()).thenReturn(1000L);
        when(mockStat.contentType()).thenReturn("audio/mpeg");
        when(minioStorageService.getObjectMetadata(anyString())).thenReturn(mockStat);

        // Provide dummy bytes for the stream
        when(minioStorageService.getObjectStream(anyString()))
                .thenReturn(new ByteArrayInputStream(new byte[1000]));

        // 3. Request bytes 0-499 (the first half of the file)
        mockMvc.perform(get("/api/v1/tracks/" + track.getId() + "/stream")
                        .header(HttpHeaders.RANGE, "bytes=0-499")
                        .with(user(listenerId.toString())))
                // Expect 206 Partial Content!
                .andExpect(status().isPartialContent())
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, "audio/mpeg"))
                .andExpect(header().string(HttpHeaders.ACCEPT_RANGES, "bytes"))
                .andExpect(header().string(HttpHeaders.CONTENT_LENGTH, "500"))
                .andExpect(header().string(HttpHeaders.CONTENT_RANGE, "bytes 0-499/1000"));
    }


    @Test
    @DisplayName("Lifecycle: Artist can publish, hide, and archive their own tracks")
    void shouldManageTrackLifecycle() throws Exception {
        Track track = Track.builder()
                .artistId(artistId)
                .title("Lifecycle Demo")
                .minioBucketPath("dummy/audio.mp3")
                .status(TrackStatus.APPROVED)
                .durationSeconds(180)
                .build();
        track = trackRepository.save(track);

        mockMvc.perform(post("/api/v1/tracks/" + track.getId() + "/publish")
                        .with(user(artistId.toString()).roles("ARTIST")))
                .andExpect(status().isNoContent());

        verify(trackTransitionEngine).transitionTrack(eq(track.getId()), eq(TrackStatus.PUBLISHED), anyString(), any());

        mockMvc.perform(patch("/api/v1/tracks/" + track.getId() + "/visibility")
                        .with(user(artistId.toString()).roles("ARTIST")))
                .andExpect(status().isNoContent());

        mockMvc.perform(delete("/api/v1/tracks/" + track.getId())
                        .with(user(artistId.toString()).roles("ARTIST")))
                .andExpect(status().isNoContent());

        verify(trackTransitionEngine).transitionTrack(eq(track.getId()), eq(TrackStatus.ARCHIVED), anyString(), any());
    }

    @Test
    @DisplayName("Queries: Should fetch paginated public and studio feeds")
    void shouldFetchPaginatedFeeds() throws Exception {
        Track publicTrack = Track.builder()
                .artistId(artistId)
                .title("Public Hit")
                .minioBucketPath("dummy/audio1.mp3")
                .status(TrackStatus.PUBLISHED)
                .durationSeconds(200)
                .build();
        trackRepository.save(publicTrack);

        mockMvc.perform(get("/api/v1/tracks")
                        .with(user(listenerId.toString())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content[0].title").value("Public Hit"));

        Track studioTrack = Track.builder()
                .artistId(artistId)
                .title("Studio Draft")
                .minioBucketPath("dummy/audio2.mp3")
                .status(TrackStatus.DRAFT)
                .durationSeconds(150)
                .build();
        trackRepository.save(studioTrack);

        mockMvc.perform(get("/api/v1/tracks/studio")
                        .with(user(artistId.toString())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(2));
    }
}