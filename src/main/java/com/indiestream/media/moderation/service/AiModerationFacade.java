package com.indiestream.media.moderation.service;

import com.indiestream.media.catalog.domain.Track;
import com.indiestream.media.moderation.dto.AiModerationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

/**
 * Public facade acting as the single entry point to the AI Moderation Sub-domain.
 * Encapsulates the internal complexities of the Gemini client and the Decision Engine.
 */
@Service
@RequiredArgsConstructor
public class AiModerationFacade {

    private final GeminiModerationClient geminiModerationClient;
    private final ModerationDecisionEngine moderationDecisionEngine;

    /**
     * Executes the end-to-end AI moderation workflow.
     *
     * @param track     The track aggregate to evaluate.
     * @param audioOgg  The pre-processed OGG audio resource.
     * @param coverWebp The pre-processed WebP cover resource (Nullable).
     */
    public void executeAiModeration(Track track, Resource audioOgg, Resource coverWebp) {
        AiModerationResponse aiResponse = geminiModerationClient.analyze(track, audioOgg, coverWebp);
        moderationDecisionEngine.processAiVerdict(track, aiResponse);
    }
}