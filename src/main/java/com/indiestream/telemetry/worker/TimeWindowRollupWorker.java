package com.indiestream.telemetry.worker;

import com.indiestream.shared.event.PlaylistCountersAggregatedEvent;
import com.indiestream.shared.event.TrackCountersAggregatedEvent;
import com.indiestream.telemetry.repository.TelemetryRollupRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

/**
 * Distributed orchestrator for time-series aggregation.
 * Executes exact-once cron jobs to rollup high-volume telemetry into analytics tables
 * and broadcasts deltas to core modules via Spring Modulith Events.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TimeWindowRollupWorker {

    private final TelemetryRollupRepository rollupRepository;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * CRON: Executes at minute 5 of every hour.
     */
    @Scheduled(cron = "0 5 * * * *")
    @SchedulerLock(name = "hourly_telemetry_rollup", lockAtLeastFor = "2m", lockAtMostFor = "10m")
    public void executeHourlyRollupCron() {
        OffsetDateTime endHour = OffsetDateTime.now(ZoneOffset.UTC).truncatedTo(ChronoUnit.HOURS);
        OffsetDateTime targetHour = endHour.minusHours(6); // Auto-Heal Strategy

        log.info("[CRON] Starting Hourly Telemetry Rollup for window: {} to {}", targetHour, endHour);
        Map<String, Integer> stats = executeHourlyRollup(targetHour, endHour);
        log.info("[CRON] Aggregation complete: {}", stats);
    }

    /**
     * CRON: Executes every day at 02:00 AM.
     */
    @Scheduled(cron = "0 0 2 * * *")
    @SchedulerLock(name = "daily_telemetry_rollup", lockAtLeastFor = "5m", lockAtMostFor = "30m")
    public void executeDailyRollupCron() {
        OffsetDateTime targetDayEnd = OffsetDateTime.now(ZoneOffset.UTC).truncatedTo(ChronoUnit.DAYS);
        OffsetDateTime targetDayStart = targetDayEnd.minusDays(3); // Auto-Heal Strategy

        log.info("[CRON] Starting Daily Telemetry Rollup for window: {} to {}", targetDayStart, targetDayEnd);
        int rows = executeDailyRollup(targetDayStart, targetDayEnd);
        log.info("[CRON] Daily aggregation complete. {} tracks preserved.", rows);
    }

    // --- PUBLIC METHODS FOR MANUAL TRIGGERING VIA ADMIN API ---

    /**
     * Executes the hourly database aggregation and dispatches Modulith events.
     *
     * @return A map containing operation statistics for the caller.
     */
    public Map<String, Integer> executeHourlyRollup(OffsetDateTime start, OffsetDateTime end) {
        log.info("Executing Hourly Rollup from {} to {}", start, end);
        int trackPlayRows = rollupRepository.aggregateHourlyTrackPlaybacks(start, end);
        int trackInteractionRows = rollupRepository.aggregateHourlyTrackInteractions(start, end);

        int playlistPlayRows = rollupRepository.aggregateHourlyPlaylistPlaybacks(start, end);
        int playlistInteractionRows = rollupRepository.aggregateHourlyPlaylistInteractions(start, end);

        OffsetDateTime activeClosedHour = end.minusHours(1);
        List<TrackCountersAggregatedEvent> trackEvents = rollupRepository.fetchTrackStatsForHour(activeClosedHour);
        trackEvents.forEach(eventPublisher::publishEvent);

        List<PlaylistCountersAggregatedEvent> playlistEvents = rollupRepository.fetchPlaylistStatsForHour(activeClosedHour);
        playlistEvents.forEach(eventPublisher::publishEvent);

        return Map.of(
                "trackPlaybacksAggregated", trackPlayRows,
                "trackInteractionsAggregated", trackInteractionRows,
                "playlistInteractionsAggregated", playlistInteractionRows,
                "modulithEventsDispatched", trackEvents.size() + playlistEvents.size()
        );
    }

    /**
     * Executes the daily database compression logic.
     */
    public int executeDailyRollup(OffsetDateTime start, OffsetDateTime end) {
        log.info("Executing Daily Compression Rollup from {} to {}", start, end);
        rollupRepository.aggregateDailyTrackStats(start, end);
        rollupRepository.aggregateDailyPlaylistStats(start, end);
        rollupRepository.aggregateDailyTrackDemographics(start, end);
        return rollupRepository.aggregateDailyTrackStats(start, end);
    }
}