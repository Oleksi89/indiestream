package com.indiestream.media.pipeline.service;

import com.indiestream.media.catalog.dto.TrackDto;
import com.indiestream.media.catalog.service.TrackService;
import com.indiestream.media.storage.service.MinioStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;

/**
 * Utility service for transcoding, segmenting, and analyzing audio files.
 * Stripped of all FSM transition logic to maintain Single Responsibility.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AudioProcessingService {

    private final TrackService trackService;
    private final MinioStorageService minioStorageService;

    /**
     * Executes synchronous FFmpeg HLS segmentation.
     * Updates the technical manifest paths and duration in the database without altering FSM status.
     *
     * @param trackId The UUID of the track to process
     */
    public void processAudioToHls(UUID trackId) {
        log.info("Starting synchronous HLS processing for track ID: {}", trackId);
        Path tempDir = null;

        try {
            TrackDto track = trackService.getTrackById(trackId, null, true);
            tempDir = Files.createTempDirectory("hls_" + trackId);

            log.info("Processing Master Track HLS: {}", trackId);
            int durationSeconds = processSingleMedia(track.minioBucketPath(), "master", track, tempDir);

            if (track.stemsMetadata() != null && !track.stemsMetadata().isEmpty()) {
                log.info("Processing Stems HLS: {}", trackId);
                for (Map.Entry<String, String> entry : track.stemsMetadata().entrySet()) {
                    processSingleMedia(entry.getValue(), "stems/" + entry.getKey(), track, tempDir);
                }
            }

            // Path to the master manifest is saved as the primary reference
            String masterManifestPath = "artists/" + track.artistId() + "/hls/" + trackId + "/master/index.m3u8";

            // Save the technical metadata decoupled from the FSM status
            trackService.updateTrackMediaMetadata(trackId, masterManifestPath, durationSeconds);
            log.info("Successfully processed HLS (Master + Stems) and updated metadata for track ID: {}", trackId);

        } catch (Exception e) {
            log.error("HLS processing failed for track ID: {}", trackId, e);
            throw new RuntimeException("HLS Pipeline failure: " + e.getMessage(), e);
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

        // Read stream before waitFor() to prevent OS buffer deadlocks
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
            paths.sorted((p1, p2) -> -p1.compareTo(p2))
                    .map(Path::toFile)
                    .forEach(File::delete);
        } catch (Exception e) {
            log.warn("Failed to clean up temporary directory: {}", tempDir, e);
        }
    }
}