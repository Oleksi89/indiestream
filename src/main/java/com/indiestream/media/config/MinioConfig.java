package com.indiestream.media.config;

import io.minio.MinioClient;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(MinioProperties.class)
public class MinioConfig {

    /**
     * Constructs the MinioClient using the strongly-typed MinioProperties.
     * // TODO: [Media] - Implement a startup check to automatically create the target bucket if it doesn't exist.
     */
    @Bean
    public MinioClient minioClient(MinioProperties properties) {
        return MinioClient.builder()
                .endpoint(properties.url())
                .credentials(properties.accessKey(), properties.secretKey())
                .build();
    }
}