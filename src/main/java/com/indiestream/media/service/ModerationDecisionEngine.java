package com.indiestream.media.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indiestream.media.domain.ModerationVerdict;
import com.indiestream.media.domain.Track;
import com.indiestream.media.domain.TrackStatus;
import com.indiestream.media.domain.TrackTags;
import com.indiestream.media.dto.AiModerationResponse;
import com.indiestream.media.repository.TrackRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * Core business logic engine that evaluates AI moderation responses.
 * Enforces compliance policies, assigns semantic metadata, and triggers FSM state changes.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ModerationDecisionEngine {

    private final TrackTransitionEngine transitionEngine;
    private final TrackRepository trackRepository;
    private final ObjectMapper objectMapper;

    /**
     * Processes the structured AI response and transitions the track state.
     *
     * @param track      The entity to update.
     * @param aiResponse The strict JSON schema output from Gemini.
     */
    @Transactional
    public void processAiVerdict(Track track, AiModerationResponse aiResponse) {
        log.info("Processing AI Moderation Verdict for Track ID: {} - Verdict: {}, Confidence: {}",
                track.getId(), aiResponse.verdict(), aiResponse.confidenceScore());

        double confidence = aiResponse.confidenceScore();
        ModerationVerdict verdict = aiResponse.verdict();

        // Convert strict record back to Map for dynamic JSONB audit logging
        Map<String, Object> aiPayload = objectMapper.convertValue(aiResponse, new TypeReference<>() {
        });

        updateTrackSemanticMetadata(track, aiResponse);

        // Execute Strict Business Logic Matrix
        if (verdict == ModerationVerdict.CLEAN && confidence >= 0.7) {
            transitionEngine.transitionTrack(track.getId(), TrackStatus.APPROVED, "AI Moderation passed successfully.", aiPayload);

        } else if (verdict == ModerationVerdict.EXPLICIT_MINOR && confidence >= 0.7) {
            if (track.isExplicit()) {
                transitionEngine.transitionTrack(track.getId(), TrackStatus.APPROVED, "Minor explicit content detected and correctly declared by artist.", aiPayload);
            } else {
                transitionEngine.transitionTrack(track.getId(), TrackStatus.NEEDS_REVISION, "Explicit language detected. Please explicitly mark your track as 'Explicit' in metadata.", aiPayload);
            }

        } else if (verdict == ModerationVerdict.BANNED_CONTENT && confidence > 0.9) {
            transitionEngine.transitionTrack(track.getId(), TrackStatus.BANNED, "Prohibited content detected with high confidence: " + aiResponse.reasoning(), aiPayload);

        } else {
            // Human Fallback: Handles REQUIRES_HUMAN or low-confidence edge cases
            String reason = String.format("Requires human review. Verdict: %s, Confidence: %.2f. Reason: %s",
                    verdict, confidence, aiResponse.reasoning());
            transitionEngine.transitionTrack(track.getId(), TrackStatus.IN_REVIEW, reason, aiPayload);
        }
    }

    /**
     * Isolates the assignment of auto-generated tags to the strictly typed JSONB field.
     */
    private void updateTrackSemanticMetadata(Track track, AiModerationResponse response) {
        Set<String> newAiTags = new HashSet<>();

        if (response.suggestedGenres() != null) {
            newAiTags.addAll(response.suggestedGenres());
        }
        if (response.suggestedMoods() != null) {
            newAiTags.addAll(response.suggestedMoods());
        }

        TrackTags currentTags = track.getTags();
        TrackTags updatedTags = new TrackTags(
                currentTags.custom(),
                currentTags.moods(),
                newAiTags
        );

        track.setTags(updatedTags);
        trackRepository.save(track);
    }
}