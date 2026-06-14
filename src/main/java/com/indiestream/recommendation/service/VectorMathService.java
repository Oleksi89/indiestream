package com.indiestream.recommendation.service;

import com.indiestream.auth.AuthModuleApi;
import com.indiestream.recommendation.repository.UserBlacklistRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.Assert;

import java.util.UUID;

/**
 * Pure Mathematical Engine for the Recommendation Domain.
 * Handles Exponential Moving Average (EMA) shifts for the 768D User Taste Vector ($V_{user}$).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VectorMathService {

    private final AuthModuleApi authModuleApi;
    private final UserBlacklistRepository userBlacklistRepository;

    private static final int DIMENSIONS = 768;

    /**
     * Constant Weights (Alpha) for EMA shifts based on user interaction semantics.
     */
    public static final float ALPHA_LIKE = 0.15f;
    public static final float ALPHA_PLAYLIST_ADD = 0.10f;
    public static final float ALPHA_FULL_PLAY = 0.05f;
    public static final float ALPHA_SKIP = -0.05f;
    public static final float ALPHA_NOT_INTERESTED = -0.20f;

    /**
     * Shifts the User's Taste Vector mathematically based on their interaction with a specific track.
     *
     * @param userId      The user's UUID.
     * @param trackVector The 768D vector of the track interacted with.
     * @param alpha       The weight of the interaction (Positive or Negative).
     */
    @Transactional
    public void shiftUserTasteVector(UUID userId, float[] trackVector, float alpha) {
        if (trackVector == null || trackVector.length != DIMENSIONS) {
            log.warn("Invalid track vector length. Expected {}, got {}. Cannot shift $V_user$ for User {}", DIMENSIONS, trackVector == null ? "null" : trackVector.length, userId);
            return;
        }

        float[] currentVector = authModuleApi.getTasteVector(userId);
        float[] newVector = calculateEma(currentVector, trackVector, alpha);

        authModuleApi.updateTasteVector(userId, newVector);
    }

    /**
     * Mathematical core applying the EMA formula
     * If V_current is NULL (Cold Start), it initializes entirely to the V_track.
     */
    public float[] calculateEma(float[] currentVector, float[] trackVector, float alpha) {
        Assert.notNull(trackVector, "Track vector cannot be null for EMA calculation");

        // Cold Start Scenario
        if (currentVector == null || currentVector.length != DIMENSIONS) {
            log.debug("Cold Start initialization of $V_user$");
            return trackVector.clone();
        }

        float[] newVector = new float[DIMENSIONS];
        for (int i = 0; i < DIMENSIONS; i++) {
            // Standard EMA calculation per dimension
            newVector[i] = (currentVector[i] * (1.0f - alpha)) + (trackVector[i] * alpha);
        }

        // Normalize the resulting vector so cosine distance works properly
        return normalize(newVector);
    }

    /**
     * L2 Normalization (Euclidean norm) to ensure the vector remains on the unit sphere.
     * Essential for pgvector <=> (cosine distance) to function accurately without magnitude distortion.
     */
    private float[] normalize(float[] vector) {
        double sum = 0.0;
        for (float v : vector) {
            sum += v * v;
        }

        if (sum == 0) return vector; // Prevent division by zero

        float magnitude = (float) Math.sqrt(sum);
        float[] normalized = new float[DIMENSIONS];
        for (int i = 0; i < DIMENSIONS; i++) {
            normalized[i] = vector[i] / magnitude;
        }
        return normalized;
    }

    /**
     * Danger Zone operation: Resets the user's taste profile completely.
     * Deletes the vector AND clears the negative interaction history.
     */
    @Transactional
    public void resetTasteProfile(UUID userId) {
        authModuleApi.clearTasteVector(userId);
        userBlacklistRepository.deleteAllByUserId(userId);
        log.info("Taste Profile and Blacklist cleared for user: {}", userId);
    }
}