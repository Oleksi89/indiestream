package com.indiestream.playlist.service;

import io.minio.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.UUID;

/**
 * Isolated storage service for the Playlist module.
 * Injects the global MinioClient bean directly to prevent Modulith boundary violations
 * that would occur by injecting the Media module's MinioStorageService.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PlaylistStorageService {

    private final MinioClient minioClient;

    @Value("${minio.bucket:indiestream}")
    private String minioBucket;

    public String uploadCover(MultipartFile file, UUID playlistId) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Cannot upload an empty file.");
        }

        try {
            String originalFilename = file.getOriginalFilename();
            String extension = originalFilename != null && originalFilename.contains(".")
                    ? originalFilename.substring(originalFilename.lastIndexOf("."))
                    : ".jpg";

            String objectName = String.format("playlists/%s/cover/%s%s",
                    playlistId.toString(), UUID.randomUUID().toString(), extension);

            String contentType = file.getContentType();
            if (contentType == null || contentType.isBlank()) {
                contentType = "image/jpeg";
            }

            try (InputStream inputStream = file.getInputStream()) {
                minioClient.putObject(
                        PutObjectArgs.builder()
                                .bucket(minioBucket)
                                .object(objectName)
                                .stream(inputStream, file.getSize(), -1)
                                .contentType(contentType)
                                .build()
                );
            }

            return objectName;
        } catch (Exception e) {
            log.error("Failed to upload playlist cover to MinIO", e);
            throw new RuntimeException("Failed to store playlist cover.", e);
        }
    }

    public void deleteCover(String objectName) {
        if (objectName == null || objectName.isBlank()) return;
        try {
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(minioBucket)
                            .object(objectName)
                            .build()
            );
        } catch (Exception e) {
            log.warn("Failed to delete obsolete playlist cover from MinIO: {}", objectName, e);
        }
    }

    public InputStream getCoverStream(String objectName) {
        try {
            return minioClient.getObject(
                    GetObjectArgs.builder()
                            .bucket(minioBucket)
                            .object(objectName)
                            .build()
            );
        } catch (Exception e) {
            log.error("Failed to stream playlist cover: {}", objectName, e);
            throw new RuntimeException("Cover not found or inaccessible.");
        }
    }
}