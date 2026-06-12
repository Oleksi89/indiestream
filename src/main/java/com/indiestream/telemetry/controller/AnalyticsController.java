package com.indiestream.telemetry.controller;

import com.indiestream.shared.dto.PageResponse;
import com.indiestream.telemetry.domain.AnalyticsTimeRange;
import com.indiestream.telemetry.dto.analytics.*;
import com.indiestream.telemetry.service.analytics.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.UUID;

/**
 * CQRS Read-API Boundary for Analytics.
 * Strictly enforces Role-Based Access Control and IDOR protections.
 */
@RestController
@RequestMapping("/api/v1/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final ArtistAnalyticsService artistAnalyticsService;
    private final CuratorAnalyticsService curatorAnalyticsService;
    private final AdminAnalyticsService adminAnalyticsService;
    private final UserListeningHistoryService userListeningHistoryService;
    private final CsvExportService csvExportService;

    /**
     * ARTIST WORKSPACE: Global profile overview.
     */
    @GetMapping("/artist/overview")
    @PreAuthorize("hasRole('ARTIST')")
    public ResponseEntity<ArtistOverviewDto> getArtistOverview(
            Principal principal,
            @RequestParam(defaultValue = "LAST_7_DAYS") AnalyticsTimeRange timeRange) {

        UUID artistId = UUID.fromString(principal.getName());
        return ResponseEntity.ok(artistAnalyticsService.getArtistGlobalOverview(artistId, timeRange));
    }

    /**
     * ARTIST WORKSPACE: Deep dive into specific track metrics (with real-time concurrent listeners).
     */
    @GetMapping("/artist/tracks/{trackId}")
    @PreAuthorize("hasRole('ARTIST')")
    public ResponseEntity<TrackAnalyticsResponseDto> getTrackAnalytics(
            Principal principal,
            @PathVariable UUID trackId,
            @RequestParam(defaultValue = "LAST_7_DAYS") AnalyticsTimeRange timeRange) {

        UUID artistId = UUID.fromString(principal.getName());
        return ResponseEntity.ok(artistAnalyticsService.getTrackAnalyticsWithRealTime(trackId, artistId, timeRange));
    }

    /**
     * ARTIST WORKSPACE: CSV Export for a specific track.
     */
    @GetMapping(value = "/artist/tracks/{trackId}/export", produces = "text/csv")
    @PreAuthorize("hasRole('ARTIST')")
    public ResponseEntity<byte[]> exportTrackAnalyticsCsv(
            Principal principal,
            @PathVariable UUID trackId,
            @RequestParam(defaultValue = "LAST_30_DAYS") AnalyticsTimeRange timeRange) {

        UUID artistId = UUID.fromString(principal.getName());
        TrackAnalyticsResponseDto data = artistAnalyticsService.getTrackHistoricalAnalytics(trackId, artistId, timeRange);
        byte[] csvBytes = csvExportService.generateTimeSeriesCsv(data.timeSeries());

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"track_analytics_" + trackId + ".csv\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csvBytes);
    }

    /**
     * CURATOR WORKSPACE: Playlist performance overview.
     */
    @GetMapping("/curator/playlists/{playlistId}")
    public ResponseEntity<PlaylistOverviewDto> getPlaylistAnalytics(
            Principal principal,
            @PathVariable UUID playlistId,
            @RequestParam(defaultValue = "LAST_7_DAYS") AnalyticsTimeRange timeRange) {

        // No explicit role needed; ownership is enforced via SQL JOINS in the Repository
        UUID ownerId = UUID.fromString(principal.getName());
        return ResponseEntity.ok(curatorAnalyticsService.getPlaylistOverview(playlistId, ownerId, timeRange));
    }

    /**
     * ADMIN WORKSPACE: Global platform health and telemetry overview.
     */
    @GetMapping("/admin/platform")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SummaryMetricsDto> getPlatformOverview(
            @RequestParam(defaultValue = "LAST_7_DAYS") AnalyticsTimeRange timeRange) {

        return ResponseEntity.ok(adminAnalyticsService.getPlatformOverview(timeRange));
    }

    /**
     * USER DASHBOARD: Fetch authentic paginated listening history.
     * Automatically filters skips and administrative system-internal loops.
     */
    @GetMapping("/me/history")
    public ResponseEntity<PageResponse<ListeningHistoryItemDto>> getMyListeningHistory(
            Principal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        UUID userId = UUID.fromString(principal.getName());
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(userListeningHistoryService.getUserHistory(userId, pageable));
    }
}