package com.indiestream.infrastructure.seeder.controller;

import com.indiestream.infrastructure.seeder.service.PlatformSeederOrchestrator;
import com.indiestream.infrastructure.seeder.service.SeederCleanupService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
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

    @PostMapping("/phase1-ingest")
    public ResponseEntity<String> executePhase1() {
        seederOrchestrator.executeIngestionPhase();
        return ResponseEntity.ok("Phase 1 (Ingestion) initiated. Check logs for progress. Wait for the background AI pipeline to finish before running Phase 2.");
    }

    @PostMapping("/phase2-publish")
    public ResponseEntity<Map<String, Object>> executePhase2() {
        int count = seederOrchestrator.executePublishPhase();
        return ResponseEntity.ok(Map.of(
                "message", "Phase 2 (Publishing) completed.",
                "publishedTracks", count
        ));
    }

    @PostMapping("/phase3-simulate")
    public ResponseEntity<String> executePhase3() {
        seederOrchestrator.executeSimulationPhase();
        return ResponseEntity.ok("Phase 3 (Simulation) completed. Social Playlists and Telemetry generated.");
    }

    @PostMapping("/cleanup")
    public ResponseEntity<String> teardownSeedData() {
        cleanupService.executeNamespaceTeardown();
        return ResponseEntity.ok("Seed Teardown Completed. Namespace @seed.indiestream.local flushed.");
    }
}