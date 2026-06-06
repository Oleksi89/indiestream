package com.indiestream.media.moderation.service;

import com.indiestream.media.catalog.domain.Track;
import com.indiestream.media.moderation.dto.AiModerationResponse;
import com.indiestream.media.pipeline.exception.AiModerationException;
import com.indiestream.media.pipeline.exception.AiRateLimitException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.content.Media;
import org.springframework.ai.converter.BeanOutputConverter;
import org.springframework.ai.google.genai.GoogleGenAiChatOptions;
import org.springframework.core.io.Resource;
import org.springframework.retry.support.RetryTemplate;
import org.springframework.stereotype.Component;
import org.springframework.util.MimeTypeUtils;

import java.util.ArrayList;
import java.util.List;

/**
 * Multimodal AI Gateway utilizing the modern Google GenAI API.
 * Employs Gemini 2.5 Flash for media analysis, with strict JSON schema output.
 */
@Slf4j
@Component
public class GeminiModerationClient {

    private final ChatClient chatClient;
    private final BeanOutputConverter<AiModerationResponse> outputConverter;
    private final RetryTemplate retryTemplate;

    private static final List<String> MODEL_FALLBACK_CHAIN = List.of(
            "gemini-3.5-flash",       // Tier 1: Highest reasoning, lowest quotas (5 RPM / 20 RPD)
            "gemini-3.0-flash",       // Tier 2: Balanced fallback (5 RPM / 20 RPD)
            "gemini-2.5-flash",
            "gemini-3.1-flash-lite"   // Tier 3: Availability, highest quotas (15 RPM / 500 RPD)
    );

    public GeminiModerationClient(ChatClient.Builder chatClientBuilder) {
        this.outputConverter = new BeanOutputConverter<>(AiModerationResponse.class);

        this.chatClient = chatClientBuilder.build();

        this.retryTemplate = RetryTemplate.builder()
                .maxAttempts(3)
                .exponentialBackoff(2000, 2.0, 10000)
                // If hits API limit, do not retry this model. Fail fast to trigger the cascade.
                .notRetryOn(AiRateLimitException.class)
                .build();
    }

    /**
     * Analyzes audio and optional cover art for policy violations and semantic metadata.
     * Iterates through the MODEL_FALLBACK_CHAIN upon hitting rate limits.
     *
     * @param audioOgg  32kbps mono OGG audio asset
     * @param coverWebp 512x512 WebP image asset (Nullable)
     * @return Strictly parsed AiModerationResponse based on the JSON schema
     */
    public AiModerationResponse analyze(Track track, Resource audioOgg, Resource coverWebp) {
        log.info("Initiating cascaded AI Moderation for Track ID: {}", track.getId());

        for (int i = 0; i < MODEL_FALLBACK_CHAIN.size(); i++) {
            String targetModel = MODEL_FALLBACK_CHAIN.get(i);
            try {
                // Execute prompt wrapped in transient-error retry template
                return retryTemplate.execute(context ->
                        executePrompt(track, audioOgg, coverWebp, targetModel)
                );
            } catch (AiRateLimitException rateLimitEx) {
                boolean isLastModel = (i == MODEL_FALLBACK_CHAIN.size() - 1);
                log.warn("Rate limit (429) hit for model [{}]. Remaining models in cascade: {}",
                        targetModel, !isLastModel);

                if (isLastModel) {
                    log.error("All AI models in the fallback cascade have been exhausted.");
                    throw new AiModerationException("AI Moderation cascade exhausted due to quotas.", rateLimitEx);
                }
                // Loop continues, failing over to the next tier
            } catch (Exception e) {
                // Catches persistent 500s or unexpected parsing errors after all retries are exhausted
                log.error("Persistent error with model [{}]: {}. Moving to next tier.", targetModel, e.getMessage());
                if (i == MODEL_FALLBACK_CHAIN.size() - 1) {
                    throw new AiModerationException("AI Moderation failed across all tiers.", e);
                }
            }
        }

        throw new AiModerationException("AI Moderation failed to process the request.");
    }

    private AiModerationResponse executePrompt(Track track, Resource audioOgg, Resource coverWebp, String modelName) {
        log.debug("Dispatching moderation payload using model: {}", modelName);

        try {
            List<Media> mediaList = new ArrayList<>();
            mediaList.add(new Media(MimeTypeUtils.parseMimeType("audio/ogg"), audioOgg));

            if (coverWebp != null && coverWebp.exists()) {
                mediaList.add(new Media(MimeTypeUtils.parseMimeType("image/webp"), coverWebp));
            }

            String formatInstructions = outputConverter.getFormat();
            String userTags = track.getTags() != null ? String.join(", ", track.getTags().custom()) : "None";
            String genre = track.getGenre() != null ? track.getGenre() : "None";

            return chatClient.prompt()
                    .options(GoogleGenAiChatOptions.builder()
                            .model(modelName)
                            .temperature(0.0) // Enforce deterministic output
                            .responseMimeType("application/json")
                            .build())
                    .system(sysSpec -> sysSpec
                            .text(AiModerationPrompt.SYSTEM_PROMPT)
                            .param("title", track.getTitle())
                            .param("genre", genre)
                            .param("tags", userTags)
                            .param("isExplicit", String.valueOf(track.isExplicit()))
                    )
                    .user(userSpec -> userSpec
                            .text("Analyze the provided media and metadata strictly following the system instructions.\n{format}")
                            .param("format", formatInstructions)
                            .media(mediaList.toArray(new Media[0]))
                    )
                    .call()
                    .entity(outputConverter);

        } catch (Exception e) {
            // Intercept and classify the exception
            if (isRateLimitException(e)) {
                throw new AiRateLimitException("API Quota exceeded for model: " + modelName, e);
            }
            throw e; // Bubble up for standard retry processing
        }
    }

    /**
     * Inspects the exception stack to accurately identify HTTP 429 or quota errors
     * generated by the underlying RestClient or Google API SDK.
     */
    private boolean isRateLimitException(Exception e) {
        String message = e.getMessage() != null ? e.getMessage().toLowerCase() : "";
        Throwable cause = e.getCause();
        String causeMessage = cause != null && cause.getMessage() != null ? cause.getMessage().toLowerCase() : "";

        return message.contains("429") || causeMessage.contains("429")
                || message.contains("quota") || causeMessage.contains("quota")
                || message.contains("too many requests") || causeMessage.contains("too many requests");
    }
}
