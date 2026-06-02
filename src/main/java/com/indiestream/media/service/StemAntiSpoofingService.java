package com.indiestream.media.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/**
 * Anti-Spoofing engine for stem validation.
 * Uses acoustic heuristics (LUFS delta) and millisecond-precision length checks
 * to mathematically verify if provided stems reconstruct the master track.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StemAntiSpoofingService {

    private final AudioAnalyzerService audioAnalyzer;
    private final FFmpegCommandRunner commandRunner;

    // Maximum allowed length deviation (in milliseconds) between a stem and the master
    private static final long MAX_LENGTH_DELTA_MS = 500;

    // Maximum allowed Loudness (LUFS) deviation between the master and the downmixed stems
    // 3.0 LUFS provides enough buffer for minor phase/summation differences in FFmpeg's amix
    private static final double MAX_LUFS_DELTA = 3.0;

    /**
     * Executes the complete anti-spoofing pipeline.
     *
     * @param masterTrack The downloaded master track file.
     * @param stemFiles   The downloaded stem files.
     * @return A validation result detailing success or the specific reason for failure.
     */
    public AntiSpoofingResult validateStems(File masterTrack, List<File> stemFiles) {
        if (stemFiles == null || stemFiles.isEmpty()) {
            return AntiSpoofingResult.success(); // No stems to spoof
        }

        try {
            long masterDurationMs = audioAnalyzer.getDurationMs(masterTrack);

            // 1. Length Check
            for (File stem : stemFiles) {
                long stemDurationMs = audioAnalyzer.getDurationMs(stem);
                long delta = Math.abs(masterDurationMs - stemDurationMs);

                if (delta > MAX_LENGTH_DELTA_MS) {
                    log.warn("Anti-Spoofing failure: Stem {} length ({} ms) deviates from master ({} ms)",
                            stem.getName(), stemDurationMs, masterDurationMs);
                    return AntiSpoofingResult.failure("Stem duration mismatch. All stems must match the exact length of the master track.");
                }
            }

            // 2. Acoustic Check (Downmix LUFS comparison)
            double masterLufs = audioAnalyzer.calculateIntegratedLUFS(masterTrack);
            double downmixLufs = calculateDownmixLUFS(stemFiles);
            double lufsDelta = Math.abs(masterLufs - downmixLufs);

            if (log.isDebugEnabled()) {
                log.debug("Anti-Spoofing acoustic check - Master LUFS: {}, Downmix LUFS: {}, Delta: {}",
                        masterLufs, downmixLufs, lufsDelta);
            }

            if (lufsDelta > MAX_LUFS_DELTA) {
                log.warn("Anti-Spoofing failure: Acoustic mismatch. Master LUFS: {}, Downmix LUFS: {}, Delta: {}",
                        masterLufs, downmixLufs, lufsDelta);
                return AntiSpoofingResult.failure(String.format("Acoustic mismatch. The provided stems do not mathematically reconstruct the master track (LUFS Delta: %.2f)", lufsDelta));
            }

            return AntiSpoofingResult.success();

        } catch (Exception e) {
            log.error("Critical error during stem anti-spoofing validation", e);
            // Fail closed: If validation crashes, reject the stems to prevent pipeline poisoning
            return AntiSpoofingResult.failure("Internal verification pipeline error. Please re-upload standardized stems.");
        }
    }

    /**
     * Mixes all stems together in memory and calculates the LUFS of the result.
     * We use a temporary file for the downmix to avoid complex cross-platform pipe piping.
     */
    private double calculateDownmixLUFS(List<File> stemFiles) throws Exception {
        Path tempDownmixPath = Files.createTempFile("indiestream_downmix_", ".wav");
        File tempDownmixFile = tempDownmixPath.toFile();

        try {
            List<String> command = new ArrayList<>();
            command.add("ffmpeg");
            command.add("-y"); // Overwrite output

            // Add all stems as inputs
            for (File stem : stemFiles) {
                command.add("-i");
                command.add(stem.getAbsolutePath());
            }

            // Use the amix filter. 'inputs' sets the number of streams.
            // 'normalize=0' to prevent FFmpeg from auto-compressing the mix, which would ruin the LUFS check.
            String filter = String.format("amix=inputs=%d:normalize=0", stemFiles.size());

            command.add("-filter_complex");
            command.add(filter);
            command.add(tempDownmixFile.getAbsolutePath());

            // Execute the mix
            commandRunner.run(command.toArray(new String[0]));

            // Calculate LUFS of the resulting file
            return audioAnalyzer.calculateIntegratedLUFS(tempDownmixFile);

        } finally {
            // Strictly clean up the temporary downmix file
            if (tempDownmixFile.exists()) {
                boolean deleted = tempDownmixFile.delete();
                if (!deleted) {
                    log.warn("Failed to delete temporary downmix file: {}", tempDownmixFile.getAbsolutePath());
                }
            }
        }
    }

    /**
     * Internal record encapsulating the validation outcome.
     */
    public record AntiSpoofingResult(boolean isValid, String rejectionReason) {
        public static AntiSpoofingResult success() {
            return new AntiSpoofingResult(true, null);
        }

        public static AntiSpoofingResult failure(String reason) {
            return new AntiSpoofingResult(false, reason);
        }
    }
}