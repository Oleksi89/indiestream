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
     * Executes at minute 5 of every hour (e.g., 14:05, 15:05).
     * The 5-minute offset ensures all Redis buffers and DLQs for the previous hour are fully flushed.
     */
    @Scheduled(cron = "0 5 * * * *")
    @SchedulerLock(name = "hourly_telemetry_rollup", lockAtLeastFor = "2m", lockAtMostFor = "10m")
    public void executeHourlyRollup() {
        // ALWAYS target the previous fully-closed hour.
        // E.g., if cron runs at 14:05, targetHour is 13:00, endHour is 14:00.
        OffsetDateTime targetHour = OffsetDateTime.now(ZoneOffset.UTC)
                .truncatedTo(ChronoUnit.HOURS)
                .minusHours(1);
        OffsetDateTime endHour = targetHour.plusHours(1);

        log.info("Starting Hourly Telemetry Rollup for window: {} to {}", targetHour, endHour);

        // 1. Execute DB-native High Performance UPSERTs
        int trackPlayRows = rollupRepository.aggregateHourlyTrackPlaybacks(targetHour, endHour);
        int trackInteractionRows = rollupRepository.aggregateHourlyTrackInteractions(targetHour, endHour);
        int playlistInteractionRows = rollupRepository.aggregateHourlyPlaylistInteractions(targetHour, endHour);

        log.info("Aggregated {} track playback rows, {} track interaction rows, {} playlist interaction rows",
                trackPlayRows, trackInteractionRows, playlistInteractionRows);

        // 2. Fetch the computed deltas to safely broadcast to other modules
        List<TrackCountersAggregatedEvent> trackDeltas = rollupRepository.fetchTrackStatsForHour(targetHour);
        List<PlaylistCountersAggregatedEvent> playlistDeltas = rollupRepository.fetchPlaylistStatsForHour(targetHour);

        // 3. Broadcast to Spring Modulith components
        trackDeltas.forEach(eventPublisher::publishEvent);
        playlistDeltas.forEach(eventPublisher::publishEvent);

        log.info("Successfully broadcasted {} track events and {} playlist events", trackDeltas.size(), playlistDeltas.size());
    }

    /**
     * Executes every day at 02:00 AM. Rolls up the 24 hourly rows into 1 daily row permanently.
     */
    @Scheduled(cron = "0 0 2 * * *")
    @SchedulerLock(name = "daily_telemetry_rollup", lockAtLeastFor = "5m", lockAtMostFor = "30m")
    public void executeDailyRollup() {
        OffsetDateTime targetDayStart = OffsetDateTime.now(ZoneOffset.UTC)
                .truncatedTo(ChronoUnit.DAYS)
                .minusDays(1);
        OffsetDateTime targetDayEnd = targetDayStart.plusDays(1);

        log.info("Starting Daily Telemetry Rollup for day: {}", targetDayStart.toLocalDate());

        int dailyRows = rollupRepository.aggregateDailyTrackStats(targetDayStart, targetDayEnd);
        log.info("Successfully aggregated {} tracks for daily retention", dailyRows);
    }
}