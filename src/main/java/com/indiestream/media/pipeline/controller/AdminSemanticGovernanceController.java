package com.indiestream.media.pipeline.controller;

import com.indiestream.media.pipeline.dto.ReindexRequestDto;
import com.indiestream.media.pipeline.service.SemanticReindexingService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Secure endpoint for system administrators to manage AI vector synchronization.
 */
@RestController
@RequestMapping("/api/v1/admin/recommendations")
public class AdminSemanticGovernanceController {

    private final SemanticReindexingService reindexingService;

    public AdminSemanticGovernanceController(SemanticReindexingService reindexingService) {
        this.reindexingService = reindexingService;
    }

    /**
     * Triggers the asynchronous background job for semantic vector recalculation.
     * Accessible only by platform administrators.
     * Returns 202 ACCEPTED to indicate the job has been queued successfully.
     */
    @PostMapping("/reindex")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> triggerSemanticReindex(@RequestBody ReindexRequestDto request) {

        // Dispatches the background job
        reindexingService.executeReindexingJob(request);

        return ResponseEntity.accepted().body(Map.of(
                "status", "ACCEPTED",
                "message", "Semantic re-indexing background job has been queued. Check server logs for progress."
        ));
    }
}