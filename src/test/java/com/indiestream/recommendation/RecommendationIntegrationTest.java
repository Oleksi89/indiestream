package com.indiestream.recommendation;

import com.indiestream.IntegrationTestBase;
import com.indiestream.recommendation.service.VectorMathService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class RecommendationIntegrationTest extends IntegrationTestBase {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private VectorMathService vectorMathService;

    @Test
    @DisplayName("Should successfully dispatch 'Not Interested' event and return 202 Accepted")
    void shouldMarkTrackAsNotInterested() throws Exception {
        UUID trackId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        mockMvc.perform(post("/api/v1/recommendations/interactions/not-interested/" + trackId)
                        .with(user(userId.toString())))
                .andExpect(status().isAccepted());
    }

    @Test
    @DisplayName("Danger Zone: Should execute taste profile reset and return 204 No Content")
    void shouldResetTasteProfile() throws Exception {
        UUID userId = UUID.randomUUID();

        mockMvc.perform(delete("/api/v1/recommendations/taste/reset")
                        .with(user(userId.toString())))
                .andExpect(status().isNoContent());

        verify(vectorMathService).resetTasteProfile(eq(userId));
    }
}