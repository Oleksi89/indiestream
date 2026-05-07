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
import java.util.UUID;
import java.util.stream.Stream;

@Slf4j
@Service
@RequiredArgsConstructor
public class AudioProcessingService {

    private final TrackService trackService;
    private final MinioStorageService minioStorageService;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void processAudioToHls(TrackUploadedEvent event) {
        UUID trackId = event.trackId();
        log.info("Starting HLS processing for track ID: {}", trackId);

        Path tempDir = null;
        try {
            TrackDto track = trackService.getTrackById(trackId);
            tempDir = Files.createTempDirectory("hls_" + trackId);

            // 1. Download source file
            Path sourceFile = tempDir.resolve("source.wav");
            minioStorageService.downloadFile(track.minioBucketPath(), sourceFile);

            // 2. Extract accurate duration via ffprobe
            int durationSeconds = extractDuration(sourceFile);
            log.debug("Extracted duration for track {}: {} seconds", trackId, durationSeconds);

            // 3. Execute FFmpeg for HLS segmentation
            Path manifestFile = tempDir.resolve("index.m3u8");
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
            int exitCode = ffmpegProcess.waitFor();

            if (exitCode != 0) {
                // Read input stream to capture native FFmpeg errors for logging
                String errorOutput = new String(ffmpegProcess.getInputStream().readAllBytes());
                throw new RuntimeException("FFmpeg failed (Code " + exitCode + "): " + errorOutput);
            }

            // 4. Bulk upload chunks to storage
            String targetFolder = "artists/" + track.artistId() + "/hls/" + trackId;
            String manifestMinioPath = minioStorageService.uploadDirectory(tempDir, targetFolder, "index.m3u8");

            // 5. Finalize transaction boundaries
            trackService.updateTrackStatus(trackId, TrackStatus.READY, manifestMinioPath, durationSeconds);
            log.info("Successfully processed HLS for track ID: {}", trackId);

        } catch (Exception e) {
            log.error("HLS processing failed for track ID: {}", trackId, e);
            trackService.updateTrackStatus(trackId, TrackStatus.FAILED, null, null);
        } finally {
            cleanupTempFiles(tempDir);
        }
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