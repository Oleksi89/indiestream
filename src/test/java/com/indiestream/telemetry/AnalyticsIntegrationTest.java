package com.indiestream.telemetry;

import com.indiestream.IntegrationTestBase;
import com.indiestream.telemetry.dto.analytics.TrackAnalyticsResponseDto;
import com.indiestream.telemetry.service.analytics.ArtistAnalyticsService;
import com.indiestream.telemetry.service.analytics.CsvExportService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Validates the CQRS Analytics boundaries.
 * Proves that Role-Based Access Control (RBAC) securely shields sensitive
 * artist and platform performance metrics from unauthorized users.
 */
@AutoConfigureMockMvc
class AnalyticsIntegrationTest extends IntegrationTestBase {

    @Autowired
    private MockMvc mockMvc;

    // Isolate complex SQL aggregations to focus purely on Controller RBAC and HTTP routing
    @MockitoBean
    private ArtistAnalyticsService artistAnalyticsService;

    @MockitoBean
    private CsvExportService csvExportService;

    @Test
    @DisplayName("RBAC: Artist Overview should be restricted to users with ARTIST role")
    void shouldRestrictArtistOverviewToArtistRole() throws Exception {
        String url = "/api/v1/analytics/artist/overview?startDate=2026-01-01T00:00:00Z&endDate=2026-12-31T23:59:59Z";

        // 1. Regular User tries to access -> Expect 403 Forbidden
        mockMvc.perform(get(url)
                        .with(user(UUID.randomUUID().toString()).roles("USER")))
                .andExpect(status().isForbidden());

        // 2. Artist accesses successfully -> Expect 200 OK
        mockMvc.perform(get(url)
                        .with(user(UUID.randomUUID().toString()).roles("ARTIST")))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("RBAC: Admin Platform Health should be strictly restricted to ADMIN role")
    void shouldRestrictPlatformOverviewToAdminRole() throws Exception {
        String url = "/api/v1/analytics/admin/platform?startDate=2026-01-01T00:00:00Z&endDate=2026-12-31T23:59:59Z";

        // 1. Artist tries to access Admin dashboard -> Expect 403 Forbidden
        mockMvc.perform(get(url)
                        .with(user(UUID.randomUUID().toString()).roles("ARTIST")))
                .andExpect(status().isForbidden());

        // 2. Admin accesses successfully -> Expect 200 OK
        mockMvc.perform(get(url)
                        .with(user(UUID.randomUUID().toString()).roles("ADMIN")))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("File Export: Should correctly generate and serve CSV file downloads with appropriate headers")
    void shouldServeCsvExportWithCorrectHeaders() throws Exception {
        UUID trackId = UUID.randomUUID();
        String url = "/api/v1/analytics/artist/tracks/" + trackId + "/export?startDate=2026-01-01T00:00:00Z&endDate=2026-12-31T23:59:59Z";

        // Mock the underlying services to return dummy CSV bytes
        TrackAnalyticsResponseDto dummyResponse = new TrackAnalyticsResponseDto(
                "Dummy Track",
                "cover.jpg",
                85.5,
                null,
                null,
                java.util.Collections.emptyList(),
                java.util.Collections.emptyList(),
                java.util.Collections.emptyList(),
                120L
        );

        when(artistAnalyticsService.getTrackHistoricalAnalytics(any(), any(), any(), any())).thenReturn(dummyResponse);
        when(csvExportService.generateTimeSeriesCsv(any())).thenReturn("timestamp,plays\n2026-01-01,50".getBytes());

        mockMvc.perform(get(url)
                        .with(user(UUID.randomUUID().toString()).roles("ARTIST")))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, "text/csv"))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"track_analytics_" + trackId + ".csv\""))
                .andExpect(content().string("timestamp,plays\n2026-01-01,50"));
    }
}