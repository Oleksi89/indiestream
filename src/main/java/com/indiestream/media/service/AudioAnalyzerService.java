package com.indiestream.media.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.File;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Service dedicated to extracting precise metadata and acoustic heuristics from audio files.
 * Separates analysis from processing.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AudioAnalyzerService {

    private final FFmpegCommandRunner commandRunner;

    // Regex to extract the Integrated LUFS value from FFmpeg's ebur128 output
    // Matches patterns like: "I:         -14.3 LUFS"
    private static final Pattern LUFS_PATTERN = Pattern.compile("I:\\s+(-?\\d+(?:\\.\\d+)?)\\s+LUFS");

    /**
     * Extracts the exact duration of an audio file in milliseconds.
     * Uses ffprobe to read metadata headers without loading the payload into memory.
     *
     * @param audioFile The local audio file to analyze.
     * @return Duration in milliseconds.
     */
    public long getDurationMs(File audioFile) {
        String output = commandRunner.run(
                "ffprobe",
                "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                audioFile.getAbsolutePath()
        );

        try {
            double durationSeconds = Double.parseDouble(output.trim());
            return (long) Math.ceil(durationSeconds * 1000);
        } catch (NumberFormatException e) {
            log.error("Failed to parse duration from ffprobe output: {}", output);
            throw new RuntimeException("Invalid duration output from ffprobe", e);
        }
    }

    /**
     * Calculates the Integrated Loudness (LUFS) of an audio file.
     * LUFS (Loudness Units relative to Full Scale) is used as an acoustic fingerprint
     * to mathematically verify if a set of stems reconstructs the master track.
     *
     * @param audioFile The local audio file to analyze.
     * @return The integrated LUFS value.
     */
    public double calculateIntegratedLUFS(File audioFile) {
        // -nostats minimizes console spam. ebur128 filter calculates broadcast standard loudness.
        // -f null - discards the actual audio output since we only want the acoustic analysis metadata.
        String output = commandRunner.run(
                "ffmpeg",
                "-nostats",
                "-i", audioFile.getAbsolutePath(),
                "-filter_complex", "ebur128",
                "-f", "null", "-"
        );

        Matcher matcher = LUFS_PATTERN.matcher(output);
        double lufsValue = Double.NaN;

        // ebur128 filter outputs multiple lines, the integrated summary is usually at the end.
        // We iterate to find the last valid "I:" match.
        while (matcher.find()) {
            lufsValue = Double.parseDouble(matcher.group(1));
        }

        if (Double.isNaN(lufsValue)) {
            log.error("Failed to extract LUFS from FFmpeg output. Raw output: {}", output);
            throw new RuntimeException("Could not determine audio loudness (LUFS).");
        }

        return lufsValue;
    }
}