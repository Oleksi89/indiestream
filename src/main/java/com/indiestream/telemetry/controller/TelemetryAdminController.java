package com.indiestream.telemetry.controller;

import com.indiestream.telemetry.dto.SimulationReportDto;
import com.indiestream.telemetry.service.TelemetrySimulatorService;
import com.indiestream.telemetry.worker.TimeWindowRollupWorker;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.UUID;

/**
 * Administrative API for system testing, manual rollups, and traffic simulation.
 * Guarded strictly by ROLE_ADMIN.
 */
@RestController
@RequestMapping("/api/v1/admin/telemetry")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class TelemetryAdminController {

    private final TimeWindowRollupWorker rollupWorker;
    private final TelemetrySimulatorService simulatorService;

    /**
     * Forces immediate aggregation of the current ongoing hour.
     * Essential for eliminating data lag during testing.
     * @CacheEvict automatically clears the historical analytics cache upon successful execution.
     */
    @PostMapping("/rollup/hourly/force")
    @CacheEvict(value = "analytics:historical", allEntries = true)
    public ResponseEntity<Map<String, Integer>> forceHourlyRollup() {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        // Force scan from 2 hours ago up to the next hour
        OffsetDateTime start = now.minusHours(24).truncatedTo(ChronoUnit.HOURS);
        OffsetDateTime end = now.plusHours(1).truncatedTo(ChronoUnit.HOURS);

        Map<String, Integer> result = rollupWorker.executeHourlyRollup(start, end);
        return ResponseEntity.ok(result);
    }

    /**
     * Forces immediate daily compression.
     */
    @PostMapping("/rollup/daily/force")
    @CacheEvict(value = "analytics:historical", allEntries = true)
    public ResponseEntity<String> forceDailyRollup() {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime start = now.minusDays(2).truncatedTo(ChronoUnit.DAYS);

        int rows = rollupWorker.executeDailyRollup(start, now);
        return ResponseEntity.ok("Forced Daily Rollup executed. " + rows + " tracks compressed.");
    }

    /**
     * Generates extremely detailed synthetic telemetry traffic for E2E dashboard testing.
     * Uses "IndieStream-E2E-Simulator" User-Agent for easy SQL deletion later.
     *
     * @param playbacks Number of playback events to simulate.
     */
    @PostMapping("/seed")
    public ResponseEntity<SimulationReportDto> seedShadowTraffic(
            Principal principal,
            @RequestParam(defaultValue = "1000") int playbacks,
            @RequestParam(required = false) String trackName,
            @RequestParam(required = false) String playlistName) {

        UUID adminId = UUID.fromString(principal.getName());
        SimulationReportDto report = simulatorService.generateShadowTraffic(playbacks, adminId, trackName, playlistName);

        return ResponseEntity.ok(report);
    }
}