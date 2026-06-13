package com.indiestream.telemetry.controller;

import com.indiestream.media.api.MediaModuleApi;
import com.indiestream.media.api.TrackMetadata;
import com.indiestream.shared.dto.PageResponse;
import com.indiestream.telemetry.domain.AnalyticsTimeRange;
import com.indiestream.telemetry.dto.analytics.*;
import com.indiestream.telemetry.service.analytics.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.OffsetDateTime;
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
    private final MediaModuleApi mediaModuleApi;

    /**
     * ARTIST WORKSPACE: Global profile overview.
     */
    @GetMapping("/artist/overview")
    @PreAuthorize("hasRole('ARTIST')")
    public ResponseEntity<ArtistOverviewDto> getArtistOverview(
            Principal principal,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime endDate) {

        UUID artistId = UUID.fromString(principal.getName());
        return ResponseEntity.ok(artistAnalyticsService.getArtistGlobalOverview(artistId, startDate, endDate));
    }

    /**
     * ARTIST WORKSPACE: Deep dive into specific track metrics (with real-time concurrent listeners).
     */
    @GetMapping("/artist/tracks/{trackId}")
    @PreAuthorize("hasRole('ARTIST')")
    public ResponseEntity<TrackAnalyticsResponseDto> getTrackAnalytics(
            Principal principal,
            @PathVariable UUID trackId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime endDate) {

        UUID artistId = UUID.fromString(principal.getName());
        return ResponseEntity.ok(artistAnalyticsService.getTrackAnalyticsWithRealTime(trackId, artistId, startDate, endDate));
    }

    /**
     * ARTIST WORKSPACE: CSV Export for a specific track.
     */
    @GetMapping(value = "/artist/tracks/{trackId}/export", produces = "text/csv")
    @PreAuthorize("hasRole('ARTIST')")
    public ResponseEntity<byte[]> exportTrackAnalyticsCsv(
            Principal principal,
            @PathVariable UUID trackId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime endDate) {

        UUID artistId = UUID.fromString(principal.getName());
        TrackAnalyticsResponseDto data = artistAnalyticsService.getTrackHistoricalAnalytics(trackId, artistId, startDate, endDate);
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
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime endDate) {

        // No explicit role needed; ownership is enforced via SQL JOINS in the Repository
        UUID ownerId = UUID.fromString(principal.getName());
        return ResponseEntity.ok(curatorAnalyticsService.getPlaylistOverview(playlistId, ownerId, startDate, endDate));
    }

    /**
     * ADMIN WORKSPACE: Global platform health and telemetry overview.
     */
    @GetMapping("/admin/platform")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PlatformOverviewDto> getPlatformOverview(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime endDate) {

        return ResponseEntity.ok(adminAnalyticsService.getPlatformOverview(startDate, endDate));
    }

    /**
     * ADMIN WORKSPACE: Bypasses the Principal IDOR check by resolving the track's artist via MediaModuleApi.
     * Reuses the highly optimized CQRS read models without duplicating logic.
     */
    @GetMapping("/admin/tracks/{trackId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<TrackAnalyticsResponseDto> getAdminTrackAnalytics(
            @PathVariable UUID trackId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime endDate) {
        TrackMetadata metadata = mediaModuleApi.getTrackMetadata(trackId);
        return ResponseEntity.ok(artistAnalyticsService.getTrackAnalyticsWithRealTime(trackId, metadata.artistId(), startDate, endDate));
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