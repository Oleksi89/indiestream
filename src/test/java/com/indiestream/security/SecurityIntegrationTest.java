package com.indiestream.security;

import com.indiestream.IntegrationTestBase;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class SecurityIntegrationTest extends IntegrationTestBase {

    @Autowired
    private MockMvc mockMvc;

    @ParameterizedTest
    @DisplayName("Should block unauthenticated GET requests to protected API endpoints")
    @ValueSource(strings = {
            "/api/v1/users/me",
            "/api/v1/playlists",
            "/api/v1/tracks",
            "/api/v1/telemetry/pulse",
            "/api/v1/recommendations/discovery"
    })
    void shouldBlockUnauthenticatedGetRequests(String endpoint) throws Exception {
        // Spring Security without custom entry point defaults to 403 for unauthenticated requests in some configurations, or 401. Assuming standard stateless config.
        mockMvc.perform(get(endpoint))
                .andExpect(status().isForbidden());
    }

    @ParameterizedTest
    @DisplayName("Should allow unauthenticated POST requests to public Auth endpoints")
    @ValueSource(strings = {
            "/api/v1/auth/register",
            "/api/v1/auth/login"
    })
    void shouldAllowUnauthenticatedAuthRequests(String endpoint) throws Exception {
        // Expect 400 Bad Request because the payload is empty,
        // BUT not 401/403, which proves the endpoint is public.
        mockMvc.perform(post(endpoint))
                .andExpect(status().isBadRequest());
    }
}