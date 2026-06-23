package com.indiestream.playlist;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indiestream.IntegrationTestBase;
import com.indiestream.auth.dto.RegisterRequestDto;
import com.indiestream.auth.service.UserService;
import com.indiestream.media.catalog.service.TrackService;
import com.indiestream.playlist.controller.PlaylistController.CreatePlaylistRequest;
import com.indiestream.playlist.controller.PlaylistController.UpdatePlaylistRequest;
import com.indiestream.playlist.domain.Playlist;
import com.indiestream.playlist.repository.PlaylistRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Comprehensive integration tests for the Playlist Module.
 * Covers Core CRUD, Security Visibility Guards (IDOR), and Social Interactions.
 */
@AutoConfigureMockMvc
class PlaylistIntegrationTest extends IntegrationTestBase {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private PlaylistRepository playlistRepository;

    @Autowired
    private UserService userService;

    @MockitoBean
    private TrackService trackService;

    private UUID userAId;
    private UUID userBId;

    @BeforeEach
    void setUp() {
        String uniqueSuffix = UUID.randomUUID().toString().substring(0, 8);

        RegisterRequestDto reqA = new RegisterRequestDto("usera_" + uniqueSuffix + "@test.com", "usera_" + uniqueSuffix, "User A", "password123", "USER");
        userAId = userService.register(reqA).id();

        RegisterRequestDto reqB = new RegisterRequestDto("userb_" + uniqueSuffix + "@test.com", "userb_" + uniqueSuffix, "User B", "password123", "USER");
        userBId = userService.register(reqB).id();
    }

    @AfterEach
    void tearDown() {
        playlistRepository.deleteAll();
    }

    @Test
    @DisplayName("End-to-End: Create, Update, and Delete a public playlist successfully")
    void shouldPerformFullPlaylistCrudOperations() throws Exception {
        // 1. CREATE Playlist
        CreatePlaylistRequest createReq = new CreatePlaylistRequest("Cyberpunk Mix", "Synthwave vibes", true, false);

        String responseContent = mockMvc.perform(post("/api/v1/playlists")
                        .with(user(userAId.toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Cyberpunk Mix"))
                .andExpect(jsonPath("$.isPublic").value(true))
                .andExpect(jsonPath("$.ownerId").value(userAId.toString()))
                .andReturn().getResponse().getContentAsString();

        PlaylistDto createdPlaylist = objectMapper.readValue(responseContent, PlaylistDto.class);
        UUID playlistId = createdPlaylist.id();

        // 2. UPDATE Playlist
        UpdatePlaylistRequest updateReq = new UpdatePlaylistRequest("Cyberpunk 2077 Mix", "Updated description", false, false);

        mockMvc.perform(put("/api/v1/playlists/" + playlistId)
                        .with(user(userAId.toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Cyberpunk 2077 Mix"))
                .andExpect(jsonPath("$.isPublic").value(false));

        // 3. DELETE Playlist
        mockMvc.perform(delete("/api/v1/playlists/" + playlistId)
                        .with(user(userAId.toString())))
                .andExpect(status().isNoContent());

        assertThat(playlistRepository.findById(playlistId)).isEmpty();
    }

    @Test
    @DisplayName("Security: Enforce Visibility Guards (IDOR) on private playlists")
    void shouldBlockAccessToPrivatePlaylistsForUnauthorizedUsers() throws Exception {
        Playlist privatePlaylist = Playlist.builder()
                .ownerId(userAId)
                .name("Secret Tracks")
                .isPublic(false)
                .isSystem(false)
                .isCollaborative(false)
                .build();
        playlistRepository.save(privatePlaylist);

        // User B attempts to read -> 403 Forbidden
        mockMvc.perform(get("/api/v1/playlists/" + privatePlaylist.getId())
                        .with(user(userBId.toString())))
                .andExpect(status().isForbidden());

        // User B attempts to delete -> 403 Forbidden
        mockMvc.perform(delete("/api/v1/playlists/" + privatePlaylist.getId())
                        .with(user(userBId.toString())))
                .andExpect(status().isForbidden());

        // User A successfully reads
        mockMvc.perform(get("/api/v1/playlists/" + privatePlaylist.getId())
                        .with(user(userAId.toString())))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Social: Users can follow/unfollow public playlists and aggregates update correctly")
    void shouldUpdateFollowerAggregatesCorrectly() throws Exception {
        Playlist publicPlaylist = Playlist.builder()
                .ownerId(userAId)
                .name("Global Hits")
                .isPublic(true)
                .isSystem(false)
                .isCollaborative(false)
                .followersCount(0)
                .build();
        playlistRepository.save(publicPlaylist);

        // User B follows
        mockMvc.perform(post("/api/v1/playlists/" + publicPlaylist.getId() + "/followers")
                        .with(user(userBId.toString())))
                .andExpect(status().isCreated());

        // Assert aggregate incremented
        mockMvc.perform(get("/api/v1/playlists/" + publicPlaylist.getId())
                        .with(user(userAId.toString())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.followersCount").value(1));

        // User B unfollows
        mockMvc.perform(delete("/api/v1/playlists/" + publicPlaylist.getId() + "/followers")
                        .with(user(userBId.toString())))
                .andExpect(status().isNoContent());

        // Assert aggregate decremented
        mockMvc.perform(get("/api/v1/playlists/" + publicPlaylist.getId())
                        .with(user(userAId.toString())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.followersCount").value(0));
    }

    @Test
    @DisplayName("Integrity: Prevent unauthorized mutation of System Playlists")
    void shouldPreventMutationOrDeletionOfSystemPlaylists() throws Exception {
        Playlist systemPlaylist = Playlist.builder()
                .ownerId(userAId)
                .name("Liked Tracks")
                .isPublic(false)
                .isSystem(true)
                .isCollaborative(false)
                .build();
        playlistRepository.save(systemPlaylist);

        UpdatePlaylistRequest updateReq = new UpdatePlaylistRequest("Hacked Name", "Hacked Desc", false, false);

        mockMvc.perform(put("/api/v1/playlists/" + systemPlaylist.getId())
                        .with(user(userAId.toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("Bad Request"))
                .andExpect(jsonPath("$.detail").value("System playlist identity and metadata text descriptions are immutable."));

        mockMvc.perform(delete("/api/v1/playlists/" + systemPlaylist.getId())
                        .with(user(userAId.toString())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("System playlists cannot be deleted."));
    }
}