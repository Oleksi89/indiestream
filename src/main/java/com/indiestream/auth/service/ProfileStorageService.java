package com.indiestream.auth.service;

import com.indiestream.auth.exception.FileTooLargeException;
import com.indiestream.auth.exception.InvalidFileException;
import io.minio.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.List;
import java.util.UUID;

/**
 * Isolated MinIO storage service for the Auth module to respect Modulith boundaries.
 * Handles the upload and cleanup of user-specific image assets.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ProfileStorageService {

    private final MinioClient minioClient;

    @Value("${minio.bucket:indiestream}")
    private String bucket;

    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    private static final List<String> ALLOWED_MIME_TYPES = List.of("image/jpeg", "image/png", "image/webp");

    /**
     * Uploads an avatar image. Old avatars should be deleted prior to saving the new path in DB.
     */
    public String uploadAvatar(UUID userId, MultipartFile file) {
        return uploadImage(userId, file, "avatar");
    }

    /**
     * Uploads a banner image. Old banners should be deleted prior to saving the new path in DB.
     */
    public String uploadBanner(UUID userId, MultipartFile file) {
        return uploadImage(userId, file, "banner");
    }

    /**
     * Deletes an existing asset from the bucket to prevent storage bloat.
     * Fails silently to prevent blocking the user's transaction if the object is missing.
     */
    public void deleteFile(String objectPath) {
        if (objectPath == null || objectPath.isBlank()) return;
        try {
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(bucket)
                            .object(objectPath)
                            .build()
            );
        } catch (Exception e) {
            // TODO: [Auth Storage] - Implement a dead-letter queue for failed deletions if strict cleanup is required later.
            log.warn("Failed to delete old asset from MinIO: {}", objectPath, e);
        }
    }

    public StatObjectResponse getObjectMetadata(String objectName) {
        try {
            return minioClient.statObject(
                    StatObjectArgs.builder()
                            .bucket(bucket)
                            .object(objectName)
                            .build()
            );
        } catch (Exception e) {
            throw new RuntimeException("Profile media not found.");
        }
    }

    public InputStream getObjectStream(String objectName) {
        try {
            return minioClient.getObject(
                    GetObjectArgs.builder()
                            .bucket(bucket)
                            .object(objectName)
                            .build()
            );
        } catch (Exception e) {
            throw new RuntimeException("Failed to stream profile media.");
        }
    }

    private String uploadImage(UUID userId, MultipartFile file, String type) {
        validateFile(file);

        String extension = getExtension(file.getOriginalFilename());
        String objectName = String.format("users/%s/%s/%s%s", userId, type, UUID.randomUUID(), extension);

        try (InputStream inputStream = file.getInputStream()) {
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucket)
                            .object(objectName)
                            .stream(inputStream, file.getSize(), -1)
                            .contentType(file.getContentType())
                            .build()
            );
            return objectName;
        } catch (Exception e) {
            log.error("Failed to upload {} for user {}", type, userId, e);
            throw new RuntimeException("Failed to upload profile image.");
        }
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidFileException("File is empty or missing.");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new FileTooLargeException("File exceeds maximum allowed size of 5MB.");
        }
        if (!ALLOWED_MIME_TYPES.contains(file.getContentType())) {
            throw new InvalidFileException("Invalid file format. Only JPEG, PNG, and WEBP are allowed.");
        }
    }

    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) return ".jpg";
        return filename.substring(filename.lastIndexOf("."));
    }
}