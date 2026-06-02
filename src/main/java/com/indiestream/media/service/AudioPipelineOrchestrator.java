package com.indiestream.media.service;

import com.indiestream.media.domain.Track;
import com.indiestream.media.domain.TrackStatus;
import com.indiestream.media.repository.TrackRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;

/**
 * The asynchronous orchestrator for the IndieStream Audio Pipeline.
 * Executes Anti-Spoofing and AI Asset Generation workflows.
 * Runs on a dedicated task executor to isolate IO/CPU intensive FFmpeg operations.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AudioPipelineOrchestrator {

    private final TrackRepository trackRepository;
    private final MinioStorageService minioStorageService;
    private final StemAntiSpoofingService antiSpoofingService;
    private final AiAssetGeneratorService aiAssetGeneratorService;
    private final TrackTransitionEngine transitionEngine;

    /**
     * Executes the processing pipeline asynchronously.
     *
     * @param trackId The UUID of the track to process.
     */
    @Async
    public void executePipeline(UUID trackId) {
        log.info("Initiating Audio Pipeline for Track ID: {}", trackId);
        Path tempWorkspace = null;

        try {
            Track track = trackRepository.findById(trackId)
                    .orElseThrow(() -> new IllegalArgumentException("Track not found during pipeline execution"));

            // Setup Isolated Workspace
            tempWorkspace = Files.createTempDirectory("indiestream_pipeline_" + trackId);
            File masterFile = downloadMasterTrack(track, tempWorkspace);
            List<File> stemFiles = downloadStems(track, tempWorkspace);

            // Execute Anti-Spoofing Protocol
            log.info("Executing Anti-Spoofing validation for Track ID: {}", trackId);
            StemAntiSpoofingService.AntiSpoofingResult spoofResult =
                    antiSpoofingService.validateStems(masterFile, stemFiles);

            if (!spoofResult.isValid()) {
                log.warn("Track ID: {} failed Anti-Spoofing. Reason: {}", trackId, spoofResult.rejectionReason());
                // Transition to REJECTED. Passing null for AI payload as it hasn't reached that stage yet.
                transitionEngine.transitionTrack(
                        trackId,
                        TrackStatus.REJECTED,
                        spoofResult.rejectionReason(),
                        null
                );
                return; // stop pipeline
            }

            // Generate AI Assets (OGG / WebP)
            log.info("Anti-Spoofing passed. Generating AI assets for Track ID: {}", trackId);
            aiAssetGeneratorService.generateAudioAsset(masterFile, track.getArtistId(), trackId);
            aiAssetGeneratorService.generateCoverAsset(track.getCoverMinioPath(), track.getArtistId(), trackId);

            // Transition to Next FSM Phase
            log.info("Pipeline complete. Transitioning Track ID: {} to AI_ANALYSIS", trackId);
            transitionEngine.transitionTrack(
                    trackId,
                    TrackStatus.AI_ANALYSIS,
                    "Hardware processing completed successfully. Awaiting Gemini AI evaluation.",
                    null
            );

        } catch (Exception e) {
            log.error("Critical failure in Audio Pipeline for Track ID: {}", trackId, e);
            try {
                // Attempt to transition to FAILED state for manual intervention/retry
                transitionEngine.transitionTrack(trackId, TrackStatus.FAILED, "Internal pipeline error: " + e.getMessage(), null);
            } catch (Exception transitionEx) {
                log.error("Failed to transition track {} to FAILED state.", trackId, transitionEx);
            }
        } finally {
            // Environment Cleanup
            cleanupWorkspace(tempWorkspace);
            log.info("Audio Pipeline execution finalized for Track ID: {}", trackId);
        }
    }

    private File downloadMasterTrack(Track track, Path workspace) {
        Path destination = workspace.resolve("master_source.mp3");
        minioStorageService.downloadFile(track.getMinioBucketPath(), destination);
        return destination.toFile();
    }

    private List<File> downloadStems(Track track, Path workspace) {
        List<File> stemFiles = new ArrayList<>();
        Map<String, String> stemsMetadata = track.getStemsMetadata();

        if (stemsMetadata == null || stemsMetadata.isEmpty()) {
            return stemFiles;
        }

        int index = 0;
        for (Map.Entry<String, String> entry : stemsMetadata.entrySet()) {
            String stemNameSafe = entry.getKey().replaceAll("[^a-zA-Z0-9_-]", "");
            Path destination = workspace.resolve("stem_" + index + "_" + stemNameSafe + ".wav");
            minioStorageService.downloadFile(entry.getValue(), destination);
            stemFiles.add(destination.toFile());
            index++;
        }
        return stemFiles;
    }

    /**
     * Guarantees deletion of the temporary workspace and all its contents
     * to prevent disk exhaustion.
     */
    private void cleanupWorkspace(Path workspace) {
        if (workspace == null || !Files.exists(workspace)) {
            return;
        }
        try (Stream<Path> paths = Files.walk(workspace)) {
            paths.sorted((p1, p2) -> -p1.compareTo(p2)) // Delete files before directories
                    .map(Path::toFile)
                    .forEach(file -> {
                        if (!file.delete()) {
                            log.warn("Cleanup warning: Could not delete temp file: {}", file.getAbsolutePath());
                        }
                    });
        } catch (Exception e) {
            log.error("Failed to clean up pipeline workspace: {}", workspace.toAbsolutePath(), e);
        }
    }
}