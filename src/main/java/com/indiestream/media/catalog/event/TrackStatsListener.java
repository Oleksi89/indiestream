package com.indiestream.media.catalog.event;

import com.indiestream.media.catalog.repository.TrackRepository;
import com.indiestream.shared.event.TrackCountersAggregatedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

/**
 * Event listener within the Media module boundaries.
 * Asynchronously catches aggregated track statistics to safely update public catalogs.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TrackStatsListener {

    private final TrackRepository trackRepository;
    private final NamedParameterJdbcTemplate jdbcTemplate;

    /**
     * ApplicationModuleListener guarantees async execution AFTER the publisher's commit.
     * Transactional(REQUIRES_NEW) guarantees the DB updates happen in an isolated transaction.
     */
    @ApplicationModuleListener
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onTrackCountersAggregated(TrackCountersAggregatedEvent event) {
        log.debug("Received track stats rollup event for track: {}", event.trackId());

        // Exact-Once Processing Guard: Try to insert the idempotency key first
        try {
            jdbcTemplate.update(
                    "INSERT INTO processed_telemetry_events (idempotency_key) VALUES (:key)",
                    Map.of("key", event.idempotencyKey())
            );
        } catch (DataIntegrityViolationException e) {
            log.warn("Duplicate track telemetry event detected and suppressed. Key: {}", event.idempotencyKey());
            return; // Exit safely, transaction remains valid, duplicate execution blocked
        }

        // Apply atomic delta increment directly to the database row
        trackRepository.incrementTrackCounters(
                event.trackId(),
                event.newPlays(),
                event.newSkips(),
                event.newLikes()
        );

        log.info("Successfully synchronized public counters for track {} [+{} plays, +{} likes]",
                event.trackId(), event.newPlays(), event.newLikes());
    }
}