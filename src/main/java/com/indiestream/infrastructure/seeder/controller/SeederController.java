package com.indiestream.infrastructure.seeder.controller;

import com.indiestream.infrastructure.seeder.service.PlatformSeederOrchestrator;
import com.indiestream.infrastructure.seeder.service.SeederCleanupService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Infrastructure controller exclusively available when the 'seeder' Spring Profile is active.
 * Used for safely hydrating non-production environments with rich, mathematically valid data.
 */
@RestController
@RequestMapping("/api/v1/admin/seed")
@Profile("seeder")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class SeederController {

    private final PlatformSeederOrchestrator seederOrchestrator;
    private final SeederCleanupService cleanupService;


    @PostMapping("/phase1-users")
    public ResponseEntity<String> executePhase1Users(
            @RequestParam(defaultValue = "8") int artistCount,
            @RequestParam(defaultValue = "22") int listenerCount) {
        seederOrchestrator.executeUserSeeding(artistCount, listenerCount);
        return ResponseEntity.ok(String.format("Phase 1a (Users) completed. Seeded up to %d artists and %d listeners.", artistCount, listenerCount));
    }

    @PostMapping("/phase1-media")
    public ResponseEntity<String> executePhase1Media(
            @RequestParam(defaultValue = "50") int trackLimit) {
        seederOrchestrator.executeMediaSeeding(trackLimit);
        return ResponseEntity.ok(String.format("Phase 1b (Media) initiated. Ingesting up to %d tracks. Check logs for progress. Wait for the background AI pipeline to finish before running Phase 2.", trackLimit));
    }

    @PostMapping("/phase2-publish")
    public ResponseEntity<Map<String, Object>> executePhase2() {
        int count = seederOrchestrator.executePublishPhase();
        return ResponseEntity.ok(Map.of(
                "message", "Phase 2 (Publishing) completed.",
                "publishedTracks", count
        ));
    }

    @PostMapping("/phase3-playlists")
    public ResponseEntity<String> executePhase3Playlists(@RequestParam(defaultValue = "10") int userLimit) {
        seederOrchestrator.executePlaylistSeeding(userLimit);
        return ResponseEntity.ok("Phase 3a (Playlists) completed. Generated playlists for up to " + userLimit + " users.");
    }

    @PostMapping("/phase3-telemetry")
    public ResponseEntity<String> executePhase3Telemetry(
            @RequestParam(defaultValue = "3500") int playbackCount,
            @RequestParam(defaultValue = "1500") int interactionCount) {
        seederOrchestrator.executeTelemetrySeeding(playbackCount, interactionCount);
        return ResponseEntity.ok("Phase 3b (Telemetry) completed. Generated " + playbackCount + " playbacks and " + interactionCount + " interactions.");
    }

    @PostMapping("/cleanup")
    public ResponseEntity<String> teardownSeedData() {
        cleanupService.executeNamespaceTeardown();
        return ResponseEntity.ok("Seed Teardown Completed. Namespace @seed.indiestream.local flushed.");
    }
}