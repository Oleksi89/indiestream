package com.indiestream.media.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

@Configuration
@EnableAsync
public class AsyncConfig {
    // Relies on properties set in application.yml (spring.task.execution.pool)
}