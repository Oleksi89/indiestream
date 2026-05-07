package com.indiestream.media.service;

import com.indiestream.media.config.MinioProperties;
import io.minio.*;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.UUID;
import java.util.stream.Stream;

/**
 * Encapsulates all interactions with the S3-compatible blob storage.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MinioStorageService {

    private final MinioClient minioClient;
    private final MinioProperties minioProperties;

    @PostConstruct
    public void initBucket() {
        try {
            boolean found = minioClient.bucketExists(
                    BucketExistsArgs.builder().bucket(minioProperties.bucket()).build()
            );
            if (!found) {
                minioClient.makeBucket(
                        MakeBucketArgs.builder().bucket(minioProperties.bucket()).build()
                );
                log.info("Created MinIO bucket: {}", minioProperties.bucket());
            }
        } catch (Exception e) {
            log.error("Failed to initialize MinIO bucket", e);
            throw new IllegalStateException("Storage initialization failed", e);
        }
    }

    /**
     * Uploads an audio file to MinIO.
     */
    public String uploadTrackFile(MultipartFile file, UUID artistId) {
        return uploadFileInternal(file, artistId, "tracks", ".mp3");
    }

    /**
     * Uploads an image cover file to MinIO.
     * Why: Separated from audio to enforce different folder structure and default extensions.
     */
    public String uploadCoverFile(MultipartFile file, UUID artistId) {
        return uploadFileInternal(file, artistId, "covers", ".jpg");
    }

    /**
     * Uploads an individual stem file.
     * Stems are grouped logically in a subfolder within the artist's namespace.
     * The stem name is sanitized to prevent path traversal or special character issues in MinIO.
     */
    public String uploadStemFile(MultipartFile file, UUID artistId, String stemName) {
        String safeStemName = stemName.replaceAll("[^a-zA-Z0-9_-]", "").toLowerCase();
        return uploadFileInternal(file, artistId, "stems/" + safeStemName, ".wav");
    }

    /**
     * Uploads a file to MinIO and returns the generated object path
     * Generates a unique filename to prevent collisions
     * Implements fail-fast validation for file integrity
     */
    private String uploadFileInternal(MultipartFile file, UUID artistId, String folder, String defaultExt) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Cannot upload an empty or null file.");
        }

        try {
            String originalFilename = file.getOriginalFilename();
            String extension = originalFilename != null && originalFilename.contains(".")
                    ? originalFilename.substring(originalFilename.lastIndexOf("."))
                    : defaultExt;

            String objectName = String.format("artists/%s/%s/%s%s",
                    artistId.toString(), folder, UUID.randomUUID().toString(), extension);

            // Guard against null content type from poorly constructed HTTP clients
            String contentType = file.getContentType();
            if (contentType == null || contentType.isBlank()) {
                contentType = "application/octet-stream";
                log.warn("Uploaded file {} missing Content-Type. Defaulting to {}", originalFilename, contentType);
            }

            try (InputStream inputStream = file.getInputStream()) {
                minioClient.putObject(
                        PutObjectArgs.builder()
                                .bucket(minioProperties.bucket())
                                .object(objectName)
                                .stream(inputStream, file.getSize(), -1)
                                .contentType(contentType)
                                .build()
                );
            }

            return objectName;
        } catch (Exception e) {
            log.error("Failed to upload file to MinIO", e);
            // TODO: [Media] - Create generic StorageException mapped to RFC 7807 500 Internal Server Error
            throw new RuntimeException("Failed to store media file.", e);
        }
    }

    /**
     * Retrieves the metadata of an object, crucially its total size (Content-Length).
     */
    public StatObjectResponse getObjectMetadata(String objectName) {
        try {
            return minioClient.statObject(
                    StatObjectArgs.builder()
                            .bucket(minioProperties.bucket())
                            .object(objectName)
                            .build()
            );
        } catch (Exception e) {
            log.error("Failed to get object metadata for: {}", objectName, e);
            throw new RuntimeException("Media not found or inaccessible.");
        }
    }

    /**
     * Fetches a complete file from MinIO without byte range limits.
     * Essential for fetching HLS manifests and small segments entirely.
     */
    public InputStream getObjectStream(String objectName) {
        try {
            return minioClient.getObject(
                    GetObjectArgs.builder()
                            .bucket(minioProperties.bucket())
                            .object(objectName)
                            .build()
            );
        } catch (Exception e) {
            log.error("Failed to stream complete object: {}", objectName, e);
            throw new RuntimeException("Failed to stream media.");
        }
    }

    /**
     * Downloads an object from MinIO to the local filesystem.
     * Used by background workers to process files locally.
     */
    public void downloadFile(String objectName, Path destination) {
        try (InputStream stream = minioClient.getObject(
                GetObjectArgs.builder()
                        .bucket(minioProperties.bucket())
                        .object(objectName)
                        .build())) {
            Files.copy(stream, destination, StandardCopyOption.REPLACE_EXISTING);
        } catch (Exception e) {
            log.error("Failed to download object: {}", objectName, e);
            throw new RuntimeException("Failed to download file from storage.", e);
        }
    }

    /**
     * Recursively uploads a local directory to a specific MinIO folder.
     * Maps content types specifically for HLS segments and manifests.
     * Returns the absolute path to the specified manifest file.
     */
    public String uploadDirectory(Path directory, String targetFolder, String manifestFileName) {
        try (Stream<Path> paths = Files.walk(directory)) {
            paths.filter(Files::isRegularFile).forEach(path -> {
                try {
                    String fileName = path.getFileName().toString();
                    String objectName = targetFolder + "/" + fileName;

                    // Specific content types for HLS compatibility
                    String contentType = fileName.endsWith(".m3u8") ? "application/vnd.apple.mpegurl" :
                            fileName.endsWith(".ts") ? "video/MP2T" : "application/octet-stream";

                    try (InputStream is = Files.newInputStream(path)) {
                        minioClient.putObject(
                                PutObjectArgs.builder()
                                        .bucket(minioProperties.bucket())
                                        .object(objectName)
                                        .stream(is, Files.size(path), -1)
                                        .contentType(contentType)
                                        .build()
                        );
                    }
                } catch (Exception e) {
                    throw new RuntimeException("Failed to upload directory segment: " + path, e);
                }
            });
            return targetFolder + "/" + manifestFileName;
        } catch (Exception e) {
            log.error("Directory upload failed for target: {}", targetFolder, e);
            throw new RuntimeException("Failed to bulk upload directory to storage.", e);
        }
    }
}