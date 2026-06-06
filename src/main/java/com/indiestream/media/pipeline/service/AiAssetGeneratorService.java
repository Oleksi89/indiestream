package com.indiestream.media.pipeline.service;

import com.indiestream.media.storage.service.MinioStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;
import java.util.UUID;

/**
 * Service responsible for generating compressed, AI-optimized media assets.
 * Prepares lightweight OGG (Opus) and WebP files to minimize payload size
 * and API costs when interfacing with Gemini 1.5 Flash in downstream pipelines.
 */
@Slf4j
@Service
@RequiredArgsConstructor
class AiAssetGeneratorService {

    private final FFmpegCommandRunner commandRunner;
    private final MinioStorageService minioStorageService;

    /**
     * Generates an AI-optimized audio asset from the master track.
     * Uses the Opus codec in OGG container at 32 kbps mono.
     *
     * @param masterTrackFile The downloaded master track file.
     * @param artistId        The UUID of the artist.
     * @param trackId         The UUID of the track.
     * @return The MinIO object path of the generated asset.
     */
    public String generateAudioAsset(File masterTrackFile, UUID artistId, UUID trackId) {
        Path tempOggPath = null;
        try {
            tempOggPath = Files.createTempFile("indiestream_ai_audio_", ".ogg");
            File tempOggFile = tempOggPath.toFile();

            // FFmpeg command to aggressively compress audio for AI analisis
            // -ac 1: Downmix to mono
            // -c:a libopus: Use Opus codec (highly efficient for speech/music)
            // -b:a 32k: 32 kilobits per second bitrate
            commandRunner.run(
                    "ffmpeg",
                    "-y",
                    "-i", masterTrackFile.getAbsolutePath(),
                    "-ac", "1",
                    "-c:a", "libopus",
                    "-b:a", "32k",
                    tempOggFile.getAbsolutePath()
            );

            // Upload the generated asset to MinIO's secure ai_assets bucket structure
            String objectName = String.format("artists/%s/ai_assets/%s_audio.ogg", artistId.toString(), trackId.toString());

            try (InputStream is = Files.newInputStream(tempOggPath)) {
                // We use putObject directly here via the storage service to bypass the MultipartFile requirement
                return uploadStreamInternal(is, Files.size(tempOggPath), objectName, "audio/ogg");
            }

        } catch (Exception e) {
            log.error("Failed to generate AI audio asset for track: {}", trackId, e);
            throw new RuntimeException("AI Audio Asset generation failed", e);
        } finally {
            cleanupTempFile(tempOggPath);
        }
    }

    /**
     * Generates an AI-optimized visual asset from the track cover.
     * Downscales to 512x512 and compresses to WebP format.
     *
     * @param coverMinioPath The path to the original cover in MinIO. Nullable.
     * @param artistId       The UUID of the artist.
     * @param trackId        The UUID of the track.
     * @return The MinIO object path of the generated asset, or Optional.empty() if no cover exists.
     */
    public Optional<String> generateCoverAsset(String coverMinioPath, UUID artistId, UUID trackId) {
        if (coverMinioPath == null || coverMinioPath.isBlank()) {
            return Optional.empty();
        }

        Path tempSourceImage = null;
        Path tempWebPImage = null;

        try {
            tempSourceImage = Files.createTempFile("indiestream_ai_cover_src_", ".jpg");
            tempWebPImage = Files.createTempFile("indiestream_ai_cover_out_", ".webp");

            // Download original cover from MinIO
            minioStorageService.downloadFile(coverMinioPath, tempSourceImage);

            // Process image with FFmpeg
            // -vf scale=512:-1: Resize to 512px width, maintaining aspect ratio
            // -c:v libwebp: Encode as WebP
            // -q:v 50: Set quality to 50 (balance between size and visual fidelity for AI)
            commandRunner.run(
                    "ffmpeg",
                    "-y",
                    "-i", tempSourceImage.toFile().getAbsolutePath(),
                    "-vf", "scale=512:-1",
                    "-c:v", "libwebp",
                    "-q:v", "50",
                    tempWebPImage.toFile().getAbsolutePath()
            );

            // Upload to MinIO
            String objectName = String.format("artists/%s/ai_assets/%s_cover.webp", artistId.toString(), trackId.toString());

            try (InputStream is = Files.newInputStream(tempWebPImage)) {
                return Optional.of(uploadStreamInternal(is, Files.size(tempWebPImage), objectName, "image/webp"));
            }

        } catch (Exception e) {
            log.error("Failed to generate AI cover asset for track: {}", trackId, e);
            // If the cover fails, the track can still be analyzed via audio
            return Optional.empty();
        } finally {
            cleanupTempFile(tempSourceImage);
            cleanupTempFile(tempWebPImage);
        }
    }

    /**
     * Uploads an InputStream directly to MinIO, bypassing MultipartFile requirements.
     */
    private String uploadStreamInternal(InputStream is, long size, String objectName, String contentType) throws Exception {
        return minioStorageService.uploadInternalStream(is, size, objectName, contentType);
    }

    private void cleanupTempFile(Path path) {
        if (path != null && Files.exists(path)) {
            try {
                Files.delete(path);
            } catch (Exception e) {
                log.warn("Failed to delete temporary AI asset file: {}", path.toAbsolutePath());
            }
        }
    }
}