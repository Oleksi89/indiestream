package com.indiestream.playlist.event;

import com.indiestream.playlist.repository.PlaylistRepository;
import com.indiestream.shared.event.PlaylistCountersAggregatedEvent;
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
 * Event listener within the Playlist module boundaries.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PlaylistStatsListener {

    private final PlaylistRepository playlistRepository;
    private final NamedParameterJdbcTemplate jdbcTemplate;

    @ApplicationModuleListener
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onPlaylistCountersAggregated(PlaylistCountersAggregatedEvent event) {
        try {
            jdbcTemplate.update(
                    "INSERT INTO processed_telemetry_events (idempotency_key) VALUES (:key)",
                    Map.of("key", event.idempotencyKey())
            );
        } catch (DataIntegrityViolationException e) {
            log.warn("Duplicate playlist telemetry event detected and suppressed. Key: {}", event.idempotencyKey());
            return;
        }

        playlistRepository.incrementPlaylistCounters(event.playlistId(), event.newLikes());
        log.info("Successfully synchronized public counters for playlist {} [+{} likes]", event.playlistId(), event.newLikes());
    }
}