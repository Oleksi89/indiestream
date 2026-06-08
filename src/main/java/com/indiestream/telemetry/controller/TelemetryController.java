package com.indiestream.telemetry.controller;

import com.indiestream.telemetry.dto.InteractionTelemetryPayload;
import com.indiestream.telemetry.dto.PlaybackTelemetryPayload;
import com.indiestream.telemetry.security.TelemetryRateLimiter;
import com.indiestream.telemetry.service.TelemetryIngestionGateway;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public facing REST entrypoint for the high-throughput telemetry engine.
 * strictly adheres to the fire-and-forget pattern, returning HTTP 202 instantly.
 */
@RestController
@RequestMapping("/api/v1/telemetry")
@RequiredArgsConstructor
public class TelemetryController {

    private final TelemetryIngestionGateway gateway;
    private final TelemetryRateLimiter rateLimiter;

    @PostMapping("/playback")
    public ResponseEntity<Void> ingestPlayback(
            @Valid @RequestBody PlaybackTelemetryPayload payload,
            Authentication authentication,
            HttpServletRequest request
    ) {
        String clientIp = extractClientIp(request);
        rateLimiter.enforceRateLimit(clientIp);

        // Principal is guaranteed to be the String UUID by JwtAuthenticationFilter
        String userId = authentication.getName();

        gateway.ingestPlayback(payload, userId, clientIp, request.getHeader("User-Agent"));

        // HTTP 202 Accepted confirms receipt without blocking the thread for processing
        return ResponseEntity.accepted().build();
    }

    @PostMapping("/interaction")
    public ResponseEntity<Void> ingestInteraction(
            @Valid @RequestBody InteractionTelemetryPayload payload,
            Authentication authentication,
            HttpServletRequest request
    ) {
        String clientIp = extractClientIp(request);
        rateLimiter.enforceRateLimit(clientIp);

        String userId = authentication.getName();

        gateway.ingestInteraction(payload, userId, clientIp, request.getHeader("User-Agent"));

        return ResponseEntity.accepted().build();
    }

    /**
     * Resolves the true client IP behind reverse proxies or load balancers (e.g., Nginx, AWS ALB).
     */
    private String extractClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            // X-Forwarded-For can contain multiple IPs separated by commas. The first is the true client.
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}