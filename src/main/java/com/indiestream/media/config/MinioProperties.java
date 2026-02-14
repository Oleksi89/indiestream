package com.indiestream.media.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Immutable, type-safe representation of MinIO configuration properties.
 * Maps prefix "minio" from application.yml directly to this record.
 */
@ConfigurationProperties(prefix = "minio")
public record MinioProperties(
        String url,
        String accessKey,
        String secretKey,
        String bucket
) {}