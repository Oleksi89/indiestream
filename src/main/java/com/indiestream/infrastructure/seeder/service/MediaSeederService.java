package com.indiestream.infrastructure.seeder.service;

import com.indiestream.infrastructure.seeder.util.LocalMultipartFile;
import com.indiestream.media.api.MediaModuleApi;
import com.indiestream.media.catalog.dto.TrackDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Slf4j
@Service
@Profile("seeder")
@RequiredArgsConstructor
public class MediaSeederService {

    private final MediaModuleApi mediaModuleApi;
    private final Random random = new Random();

    // 15 seconds sleep to guarantee we don't trigger Gemini API HTTP 429 Rate Limits
    private static final long THROTTLE_MS = 15000;
    private static final String SEED_DATA_DIR = "./seed-data/";
    private static final String COVERS_DIR_NAME = "covers";

    public void seedMedia(List<UUID> artistIds, int trackLimit) {
        log.info("--- PHASE 1b: SEEDING MEDIA CATALOG (Limit: {}) ---", trackLimit);

        if (artistIds.isEmpty()) {
            log.warn("No seed artists available. Aborting Media Seeding.");
            return;
        }

        Path seedDir = Paths.get(SEED_DATA_DIR);
        if (!Files.exists(seedDir) || !Files.isDirectory(seedDir)) {
            log.warn("Seed data directory {} not found. Creating empty directory and skipping media ingestion.", SEED_DATA_DIR);
            try {
                Files.createDirectories(seedDir);
            } catch (IOException e) {
                log.error("Failed to create seed-data directory.");
            }
            return;
        }

        // Pre-load available covers into memory to avoid redundant disk I/O
        List<Path> availableCovers = loadCoverImages(seedDir);
        AtomicInteger ingestedCount = new AtomicInteger(0);

        try (Stream<Path> genres = Files.list(seedDir).filter(Files::isDirectory)) {
            genres.filter(dir -> !dir.getFileName().toString().equalsIgnoreCase(COVERS_DIR_NAME))
                    .forEach(genreDir -> processGenreDirectory(genreDir, artistIds, availableCovers, ingestedCount, trackLimit));
        } catch (IOException e) {
            log.error("Failed to read seed data directory", e);
        }

        log.info("Media Catalog Seeding Complete. Ingested {} tracks.", ingestedCount.get());
    }

    /**
     * Scans the covers directory once and caches the paths.
     */
    private List<Path> loadCoverImages(Path seedDir) {
        Path coversDir = seedDir.resolve(COVERS_DIR_NAME);
        if (!Files.exists(coversDir) || !Files.isDirectory(coversDir)) {
            log.info("No covers directory found at {}. Tracks will be seeded without covers.", coversDir);
            return Collections.emptyList();
        }

        try (Stream<Path> files = Files.list(coversDir)) {
            return files.filter(p -> {
                String name = p.toString().toLowerCase();
                return name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png") || name.endsWith(".webp");
            }).collect(Collectors.toList());
        } catch (IOException e) {
            log.error("Failed to read covers directory. Seeding will proceed without covers.", e);
            return Collections.emptyList();
        }
    }

    private void processGenreDirectory(Path genreDir, List<UUID> artistIds, List<Path> availableCovers, AtomicInteger ingestedCount, int trackLimit) {
        if (ingestedCount.get() >= trackLimit) {
            return; // Fast exit if limit is already reached
        }

        String genre = genreDir.getFileName().toString();

        // Capitalize first letter to align with ALLOWED_GENRES
        String rawFormatted = genre.substring(0, 1).toUpperCase() + genre.substring(1).toLowerCase();

        final String formattedGenre = mediaModuleApi.getAllowedGenres().contains(rawFormatted) ? rawFormatted : "Other";

        try (Stream<Path> tracks = Files.list(genreDir).filter(p -> p.toString().endsWith(".mp3") || p.toString().endsWith(".wav"))) {
            tracks.forEach(trackPath -> {
                if (ingestedCount.get() < trackLimit) {
                    uploadThrottledTrack(trackPath, formattedGenre, artistIds, availableCovers);
                    ingestedCount.incrementAndGet();
                }
            });
        } catch (IOException e) {
            log.error("Failed to read tracks in genre directory: {}", genre, e);
        }
    }

    private void uploadThrottledTrack(Path trackPath, String genre, List<UUID> artistIds, List<Path> availableCovers) {
        String fileName = trackPath.getFileName().toString();
        String baseName = fileName.substring(0, fileName.lastIndexOf('.'));
        String withoutDigits = baseName.replaceAll("-\\d+$", "");
        String title = Arrays.stream(withoutDigits.replace("-", " ").replace("_", " ").trim().split("\\s+"))
                .filter(word -> !word.isEmpty())
                .map(word -> Character.toUpperCase(word.charAt(0)) + word.substring(1).toLowerCase())
                .collect(Collectors.joining(" "));

        UUID randomArtist = artistIds.get(random.nextInt(artistIds.size()));

        try {
            log.info("Ingesting track '{}' for genre '{}'...", title, genre);
            LocalMultipartFile audioFile = new LocalMultipartFile("file", "audio/mpeg", trackPath);
            LocalMultipartFile coverFile = null;

            if (!availableCovers.isEmpty()) {
                Path randomCoverPath = availableCovers.get(random.nextInt(availableCovers.size()));
                String contentType = determineImageContentType(randomCoverPath);
                coverFile = new LocalMultipartFile("cover", contentType, randomCoverPath);
            }

            TrackDto track = mediaModuleApi.uploadTrackForSeeder(
                    randomArtist, title, audioFile, coverFile, genre, false, Set.of("seed", "demo")
            );

            log.info("Successfully ingested '{}' -> Title: {}. Waiting {}ms to prevent AI Rate Limits...", title, track.title(), THROTTLE_MS);

            // Critical AI Pipeline Throttle
            Thread.sleep(THROTTLE_MS);

        } catch (Exception e) {
            log.error("Failed to ingest track '{}': {}", title, e.getMessage());
        }
    }

    private String determineImageContentType(Path path) {
        String name = path.toString().toLowerCase();
        if (name.endsWith(".png")) return "image/png";
        if (name.endsWith(".webp")) return "image/webp";
        return "image/jpeg"; // Default for .jpg and .jpeg
    }
}