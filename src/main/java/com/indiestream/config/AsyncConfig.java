package com.indiestream.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@Configuration
@EnableAsync
@EnableScheduling
public class AsyncConfig {
    // Relies on properties set in application.yml (spring.task.execution.pool)
    // Allows @Async (used in Media pipeline) and @Scheduled (used in Telemetry consumers)
}