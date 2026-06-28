package com.indiestream.telemetry;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indiestream.IntegrationTestBase;
import com.indiestream.auth.dto.RegisterRequestDto;
import com.indiestream.auth.service.UserService;
import com.indiestream.telemetry.dto.PlaybackTelemetryPayload;
import com.indiestream.telemetry.service.GeoLocationResolver;
import com.indiestream.telemetry.service.TelemetryIngestionGateway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * High-throughput integration tests for the Telemetry Ingestion Gateway.
 * Validates Fire-and-Forget (HTTP 202) mechanics, DTO validation constraints,
 * and robust Token-Bucket Rate Limiting (DDoS protection).
 */
@AutoConfigureMockMvc
class TelemetryIngestionIntegrationTest extends IntegrationTestBase {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserService userService;

    // Isolate Redis Streams to test raw HTTP throughput and controller logic
    @MockitoBean
    private TelemetryIngestionGateway ingestionGateway;

    @MockitoBean
    private GeoLocationResolver geoLocationResolver;

    private UUID userId;

    @BeforeEach
    void setUp() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        userId = userService.register(new RegisterRequestDto(
                "telemetry_" + suffix + "@test.com", "telemetry_" + suffix, "Listener", "password123", "USER")).id();
    }

    @Test
    @DisplayName("Throughput: Should ingest valid playback payload and return 202 Accepted instantly")
    void shouldIngestValidPlaybackTelemetry() throws Exception {
        PlaybackTelemetryPayload validPayload = new PlaybackTelemetryPayload(
                UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
                0, 15000, 15000, "SYSTEM_PLAYLIST", null, "UA"
        );

        mockMvc.perform(post("/api/v1/telemetry/playback")
                        .with(user(userId.toString()))
                        .header("X-Forwarded-For", "203.0.113.1")
                        .header("User-Agent", "IndieStream-Client/1.0")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validPayload)))
                .andExpect(status().isAccepted());

        verify(ingestionGateway, times(1)).ingestPlayback(any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("Validation: Should reject playback payloads with durations under 2000ms (misclick filter)")
    void shouldRejectMisclickPlaybacks() throws Exception {
        PlaybackTelemetryPayload invalidPayload = new PlaybackTelemetryPayload(
                UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
                0, 1000, 1000, "SYSTEM_PLAYLIST", null, "UA"
        );

        mockMvc.perform(post("/api/v1/telemetry/playback")
                        .with(user(userId.toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidPayload)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.containsString("duration must be at least 2000ms")));
    }

    @Test
    @DisplayName("Validation: Should trigger fast-fail constructor guard on negative playback intervals")
    void shouldRejectNegativeIntervalPlaybacks() throws Exception {
        // Constructing JSON manually because the Java Record constructor will throw an exception before serialization
        String malformedJson = """
                {
                    "eventId": "%s",
                    "trackId": "%s",
                    "sessionId": "%s",
                    "startPositionMs": 5000,
                    "endPositionMs": 1000,
                    "playbackDurationMs": 4000,
                    "sourceType": "DISCOVERY"
                }
                """.formatted(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID());

        mockMvc.perform(post("/api/v1/telemetry/playback")
                        .with(user(userId.toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(malformedJson))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("Bad Request"))
                .andExpect(jsonPath("$.detail").value("End position cannot be strictly less than start position"));
    }

    @Test
    @DisplayName("Security & Resilience: Should enforce Rate Limiter and block IP after 120 requests")
    void shouldEnforceTokenBucketRateLimiting() throws Exception {
        // Use a unique fake IP to completely isolate this test's Token Bucket
        String maliciousIp = "198.51.100." + (int) (Math.random() * 255);

        PlaybackTelemetryPayload spamPayload = new PlaybackTelemetryPayload(
                UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
                0, 5000, 5000, "BOT_FARM", null, "US"
        );
        String jsonPayload = objectMapper.writeValueAsString(spamPayload);

        // 1. Exhaust the bucket (120 allowed requests per minute)
        for (int i = 0; i < 120; i++) {
            mockMvc.perform(post("/api/v1/telemetry/playback")
                            .with(user(userId.toString()))
                            .header("X-Forwarded-For", maliciousIp)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(jsonPayload))
                    .andExpect(status().isAccepted());
        }

        // 2. The 121st request MUST be blocked to protect the infrastructure
        mockMvc.perform(post("/api/v1/telemetry/playback")
                        .with(user(userId.toString()))
                        .header("X-Forwarded-For", maliciousIp) // Same IP
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isTooManyRequests()) // HTTP 429
                .andExpect(jsonPath("$.title").value("Rate Limit Exceeded"))
                .andExpect(jsonPath("$.detail").value("Too many telemetry requests. Please slow down buffer flushing."));
    }
}