package com.indiestream.telemetry.service.fraud;

import com.indiestream.telemetry.dto.PlaybackTelemetryPayload;

/**
 * Strategy interface for the Anti-Fraud Engine.
 * Implementations evaluate whether a playback event exhibits bot-like or farming behavior.
 */
public interface FraudGuard {
    boolean isSuspectedBot(PlaybackTelemetryPayload payload, String userId, String clientIp);
}