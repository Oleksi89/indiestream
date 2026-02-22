package com.indiestream.media.service;

import com.indiestream.media.config.MinioProperties;
import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.UUID;

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
     * Uploads a file to MinIO and returns the generated object path
     * Generates a unique filename to prevent collisions
     * Implements fail-fast validation for file integrity
     */
    public String uploadTrackFile(MultipartFile file, UUID artistId) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Cannot upload an empty or null file.");
        }

        try {
            String originalFilename = file.getOriginalFilename();
            String extension = originalFilename != null && originalFilename.contains(".")
                    ? originalFilename.substring(originalFilename.lastIndexOf("."))
                    : ".mp3";

            String objectName = String.format("artists/%s/tracks/%s%s",
                    artistId.toString(), UUID.randomUUID().toString(), extension);

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
                                .contentType(file.getContentType())
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
}