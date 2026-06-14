package com.indiestream.recommendation.service;

import com.indiestream.media.api.MediaVectorApi;
import com.indiestream.playlist.event.TrackAddedToPlaylistEvent;
import com.indiestream.playlist.event.TrackLikedEvent;
import com.indiestream.recommendation.domain.UserBlacklist;
import com.indiestream.recommendation.domain.UserBlacklistId;
import com.indiestream.recommendation.event.TrackNotInterestedEvent;
import com.indiestream.recommendation.repository.UserBlacklistRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

/**
 * Asynchronous orchestrator handling explicit user actions.
 * Protects the VectorMathService from malicious "Toggle Spam" using a Redis Idempotency Guard.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TasteMutationListener {

    private final VectorMathService vectorMathService;
    private final MediaVectorApi mediaVectorApi;
    private final UserBlacklistRepository userBlacklistRepository;
    private final StringRedisTemplate redisTemplate;

    private static final Duration IDEMPOTENCY_TTL = Duration.ofDays(7);

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onTrackLiked(TrackLikedEvent event) {
        if (acquireIdempotencyLock(event.userId(), event.trackId(), "LIKE")) {
            processShift(event.userId(), event.trackId(), VectorMathService.ALPHA_LIKE);
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onTrackAddedToPlaylist(TrackAddedToPlaylistEvent event) {
        if (acquireIdempotencyLock(event.userId(), event.trackId(), "PLAYLIST_ADD")) {
            processShift(event.userId(), event.trackId(), VectorMathService.ALPHA_PLAYLIST_ADD);
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onTrackNotInterested(TrackNotInterestedEvent event) {
        if (acquireIdempotencyLock(event.userId(), event.trackId(), "NOT_INTERESTED")) {
            processShift(event.userId(), event.trackId(), VectorMathService.ALPHA_NOT_INTERESTED);

            // Persist the hard blocklist
            userBlacklistRepository.save(
                    new UserBlacklist(
                            new UserBlacklistId(event.userId(), event.trackId()),
                            "User explicitly marked as not interested",
                            Instant.now()
                    )
            );
            log.info("Track {} added to blocklist for User {}", event.trackId(), event.userId());
        }
    }

    /**
     * Executes the mathematical shift if the track exists and has a calculated vector.
     */
    private void processShift(UUID userId, UUID trackId, float alpha) {
        // Fetch strictly the needed fields (id and vector) to prevent full entity hydration
        mediaVectorApi.getTrackVector(trackId).ifPresentOrElse(
                vector -> vectorMathService.shiftUserTasteVector(userId, vector, alpha),
                () -> log.warn("Cannot shift taste: Track {} has no vector space or does not exist.", trackId)
        );
    }

    /**
     * Redis Idempotency Guard.
     * Prevents a user from spamming Like/Unlike to maliciously push their vector towards a specific track.
     *
     * @return true if the action is novel and should proceed, false if it's a blocked duplicate.
     */
    private boolean acquireIdempotencyLock(UUID userId, UUID trackId, String action) {
        String key = String.format("recommendation:taste_shift:%s:%s:%s", userId, trackId, action);
        Boolean isNovel = redisTemplate.opsForValue().setIfAbsent(key, "LOCKED", IDEMPOTENCY_TTL);

        if (Boolean.FALSE.equals(isNovel)) {
            log.debug("Idempotency guard triggered: Blocked duplicate taste shift for key {}", key);
            return false;
        }
        return true;
    }
}