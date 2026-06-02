package com.indiestream.media.service;

import com.indiestream.media.TrackUploadedEvent;
import com.indiestream.media.domain.TrackStatus;
import com.indiestream.media.dto.TrackDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;

@Slf4j
@Service
@RequiredArgsConstructor
public class AudioProcessingService {

    private final TrackService trackService;
    private final MinioStorageService minioStorageService;
    private final AudioPipelineOrchestrator pipelineOrchestrator;

    /**
     * Listens for successful track uploads and delegates to the hardware pipeline.
     * AFTER_COMMIT to guarantee the Track aggregate exists in the database before processing starts.
     */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleTrackUploadedEvent(TrackUploadedEvent event) {
        UUID trackId = event.trackId();
        log.info("TrackUploadedEvent received. Delegating to AudioPipelineOrchestrator for Track ID: {}", trackId);

        pipelineOrchestrator.executePipeline(trackId);
    }

    // Note: Legacy HLS segmentation logic should be moved to a downstream worker
    @Async
    // @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void processAudioToHls(TrackUploadedEvent event) {
        UUID trackId = event.trackId();
        log.info("Starting HLS processing for track ID: {}", trackId);

        Path tempDir = null;
        try {
            TrackDto track = trackService.getTrackById(trackId);
            tempDir = Files.createTempDirectory("hls_" + trackId);

            log.info("Process Master Track: {}", trackId);
            // 1. Process Master Track
            int durationSeconds = processSingleMedia(
                    track.minioBucketPath(),
                    "master",
                    track,
                    tempDir
            );

            // 2. Process all Stems
            if (track.stemsMetadata() != null) {
                for (Map.Entry<String, String> entry : track.stemsMetadata().entrySet()) {
                    String stemName = entry.getKey();
                    String stemMinioPath = entry.getValue();
                    processSingleMedia(stemMinioPath, "stems/" + stemName, track, tempDir);
                    log.info("Stem: {}", stemName);
                }
                log.info("Starting Process all Stems: {}", trackId);
            }

            // Path to the master manifest is saved as the primary reference
            String masterManifestPath = "artists/" + track.artistId() + "/hls/" + trackId + "/master/index.m3u8";

            // Finalize transaction
            trackService.updateTrackStatus(trackId, TrackStatus.READY, masterManifestPath, durationSeconds);
            log.info("Successfully processed HLS (Master + Stems) for track ID: {}", trackId);

        } catch (Exception e) {
            log.error("HLS processing failed for track ID: {}", trackId, e);
            trackService.updateTrackStatus(trackId, TrackStatus.FAILED, null, null);
        } finally {
            cleanupTempFiles(tempDir);
        }
    }

    /**
     * Downloads, segments, and uploads a single media file (master or stem).
     * Returns the duration in seconds (extracted only for the master track to save overhead).
     */
    private int processSingleMedia(String minioSourcePath, String folderStructure, TrackDto track, Path baseTempDir) throws Exception {
        Path processingDir = baseTempDir.resolve(folderStructure);
        Files.createDirectories(processingDir);

        Path sourceFile = processingDir.resolve("source.wav");
        minioStorageService.downloadFile(minioSourcePath, sourceFile);

        // Extract duration only for the master track
        int durationSeconds = 0;
        if ("master".equals(folderStructure)) {
            durationSeconds = extractDuration(sourceFile);
            log.debug("Extracted duration for track {}: {} seconds", track.id(), durationSeconds);
        }

        Path manifestFile = processingDir.resolve("index.m3u8");
        ProcessBuilder ffmpegPb = new ProcessBuilder(
                "ffmpeg", "-i", sourceFile.toString(),
                "-c:a", "aac", "-b:a", "256k",
                "-hls_time", "5",
                "-hls_list_size", "0",
                "-f", "hls",
                manifestFile.toString()
        );

        ffmpegPb.redirectErrorStream(true);
        Process ffmpegProcess = ffmpegPb.start();

        // Read the stream BEFORE waitFor() to empty the OS buffer and prevent deadlocks
        String output = new String(ffmpegProcess.getInputStream().readAllBytes());

        int exitCode = ffmpegProcess.waitFor();

        if (exitCode != 0) {
            throw new RuntimeException("FFmpeg failed for " + folderStructure + " (Code " + exitCode + "): " + output);
        }

        String targetFolder = "artists/" + track.artistId() + "/hls/" + track.id() + "/" + folderStructure;
        minioStorageService.uploadDirectory(processingDir, targetFolder, "index.m3u8");

        return durationSeconds;
    }

    /**
     * Executes OS-level ffprobe to extract precise audio duration.
     * Avoids loading the entire file into Java memory just to read metadata.
     */
    private int extractDuration(Path sourceFile) throws Exception {
        ProcessBuilder probePb = new ProcessBuilder(
                "ffprobe", "-v", "error", "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1", sourceFile.toString()
        );
        Process probeProcess = probePb.start();
        String durationStr = new String(probeProcess.getInputStream().readAllBytes()).trim();

        int exitCode = probeProcess.waitFor();
        if (exitCode != 0 || durationStr.isEmpty()) {
            throw new RuntimeException("ffprobe failed to extract duration");
        }

        return (int) Math.ceil(Double.parseDouble(durationStr));
    }

    private void cleanupTempFiles(Path tempDir) {
        if (tempDir == null) return;
        try (Stream<Path> paths = Files.walk(tempDir)) {
            paths.map(Path::toFile).forEach(File::delete);
        } catch (Exception e) {
            log.warn("Failed to clean up temporary directory: {}", tempDir, e);
        }
    }
}