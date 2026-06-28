package com.indiestream.telemetry.service.analytics;

import com.indiestream.media.api.MediaModuleApi;
import com.indiestream.telemetry.config.TelemetryCacheTemplate;
import com.indiestream.telemetry.dto.analytics.*;
import com.indiestream.telemetry.repository.AnalyticsQueryRepository;
import com.indiestream.telemetry.repository.projection.AggregateMetricsProjection;
import com.indiestream.telemetry.repository.projection.TimeSeriesProjection;
import com.indiestream.telemetry.repository.projection.TrackAnalyticsMetadataProjection;
import com.indiestream.telemetry.service.LivePulseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Orchestrates heavy native queries into rich analytical models for Artists.
 * Utilizes centralized programmatic Redis caching for historical data.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ArtistAnalyticsService {

    private final AnalyticsQueryRepository queryRepository;
    private final LivePulseService livePulseService;
    private final MediaModuleApi mediaModuleApi;
    private final TelemetryCacheTemplate cacheTemplate;

    private static final Duration CACHE_TTL = Duration.ofMinutes(10);
    private static final String CACHE_PREFIX = "analytics:historical:";

    public ArtistOverviewDto getArtistGlobalOverview(UUID artistId, OffsetDateTime startDate, OffsetDateTime endDate) {
        OffsetDateTime snappedStart = snapToFiveMinutes(startDate);
        OffsetDateTime snappedEnd = snapToFiveMinutes(endDate);
        String cacheKey = CACHE_PREFIX + "artist:" + artistId + ":" + snappedStart.toEpochSecond() + ":" + snappedEnd.toEpochSecond();

        return cacheTemplate.getOrCompute(cacheKey, ArtistOverviewDto.class, CACHE_TTL, () -> {
            // Using snapped boundaries for all calculations to prevent data drift
            long durationSeconds = ChronoUnit.SECONDS.between(snappedStart, snappedEnd);
            OffsetDateTime prevStart = snappedStart.minusSeconds(durationSeconds);
            OffsetDateTime prevEnd = snappedStart.minusNanos(1000000);

            AggregateMetricsProjection current = queryRepository.getArtistGlobalMetrics(artistId, snappedStart, snappedEnd);
            AggregateMetricsProjection prev = queryRepository.getArtistGlobalMetrics(artistId, prevStart, prevEnd);

            SummaryMetricsDto summary = GrowthCalculator.buildSummary(current, prev);
            EngagementMetricsDto engagement = GrowthCalculator.buildEngagement(current);

            List<TopPerformingTrackDto> topTracks = queryRepository.getTopTracksForArtist(artistId, snappedStart, snappedEnd, 25)
                    .stream()
                    .map(t -> new TopPerformingTrackDto(
                            t.trackId(), t.title(), t.coverMinioPath(), t.plays(), t.uniqueListeners(),
                            t.plays() > 0 ? (t.skips() / (double) t.plays()) * 100.0 : 0.0,
                            t.popularityScore()
                    )).collect(Collectors.toList());

            return new ArtistOverviewDto(summary, engagement, topTracks);
        });
    }

    /**
     * CACHED: Computes heavy historical track statistics perfectly aligned with 5-minute rollups.
     */
    public TrackAnalyticsResponseDto getTrackHistoricalAnalytics(UUID trackId, UUID artistId, OffsetDateTime startDate, OffsetDateTime endDate) {
        OffsetDateTime snappedStart = snapToFiveMinutes(startDate);
        OffsetDateTime snappedEnd = snapToFiveMinutes(endDate);
        String cacheKey = CACHE_PREFIX + "track:" + trackId + ":" + artistId + ":" + snappedStart.toEpochSecond() + ":" + snappedEnd.toEpochSecond();

        return cacheTemplate.getOrCompute(cacheKey, TrackAnalyticsResponseDto.class, CACHE_TTL, () -> {
            TrackAnalyticsMetadataProjection trackMeta = queryRepository.getTrackAnalyticsMetadata(trackId, artistId);

            long durationSeconds = ChronoUnit.SECONDS.between(snappedStart, snappedEnd);
            OffsetDateTime prevStart = snappedStart.minusSeconds(durationSeconds);
            OffsetDateTime prevEnd = snappedStart.minusNanos(1000000);

            AggregateMetricsProjection current = queryRepository.getTrackMetrics(trackId, artistId, snappedStart, snappedEnd);
            AggregateMetricsProjection prev = queryRepository.getTrackMetrics(trackId, artistId, prevStart, prevEnd);

            SummaryMetricsDto summary = GrowthCalculator.buildSummary(current, prev);
            EngagementMetricsDto engagement = GrowthCalculator.buildEngagement(current);

            List<TimeSeriesProjection> rawTimeSeries = queryRepository.getTrackTimeSeries(trackId, artistId, snappedStart, snappedEnd);
            List<TimeSeriesPointDto> continuousTimeSeries = fillMissingTimePoints(rawTimeSeries, snappedStart, snappedEnd);

            List<AttributionMetricDto> attribution = queryRepository.getTrackAttribution(trackId, artistId, snappedStart, snappedEnd)
                    .stream()
                    .map(attr -> new AttributionMetricDto(
                            attr.sourceType(), attr.count(),
                            current.totalPlays() > 0 ? (attr.count() / (double) current.totalPlays()) * 100.0 : 0.0
                    )).collect(Collectors.toList());

            List<RegionStatDto> demographics = queryRepository.getTrackDemographics(trackId, artistId, snappedStart, snappedEnd)
                    .stream()
                    .map(geo -> new RegionStatDto(
                            geo.countryOrCity(), geo.listeners(),
                            current.uniqueListeners() > 0 ? (geo.listeners() / (double) current.uniqueListeners()) * 100.0 : 0.0
                    )).collect(Collectors.toList());

            return new TrackAnalyticsResponseDto(
                    trackMeta.title(), trackMeta.coverMinioPath(), trackMeta.popularityScore(),
                    summary, engagement, continuousTimeSeries, attribution, demographics, 0
            );
        });
    }

    /**
     * Fetches the cached historical data and appends the live concurrent listener count.
     * This method itself is NOT cached.
     */
    public TrackAnalyticsResponseDto getTrackAnalyticsWithRealTime(UUID trackId, UUID artistId, OffsetDateTime startDate, OffsetDateTime endDate) {
        // Direct internal call. The cache template handles the lookup natively.
        TrackAnalyticsResponseDto historical = getTrackHistoricalAnalytics(trackId, artistId, startDate, endDate);
        long concurrent = livePulseService.getConcurrentListenersCount(trackId);

        return historical.withConcurrentListeners(concurrent);
    }

    /**
     * Reconstructs a continuous timeline for UI charts, filling missing database intervals with zeros.
     * Operates dynamically on either hourly or daily granularity based on the total time window.
     */
    private List<TimeSeriesPointDto> fillMissingTimePoints(List<TimeSeriesProjection> dbResults, OffsetDateTime start, OffsetDateTime end) {
        boolean isHourly = ChronoUnit.HOURS.between(start, end) <= 48;

        Map<OffsetDateTime, TimeSeriesProjection> dbMap = dbResults.stream()
                .collect(Collectors.toMap(
                        ts -> isHourly
                                ? ts.timestamp().truncatedTo(ChronoUnit.HOURS)
                                : ts.timestamp().truncatedTo(ChronoUnit.DAYS),
                        ts -> ts,
                        (existing, replacement) -> existing
                ));

        List<TimeSeriesPointDto> filled = new ArrayList<>();
        OffsetDateTime current = isHourly ? start.truncatedTo(ChronoUnit.HOURS) : start.truncatedTo(ChronoUnit.DAYS);
        OffsetDateTime endTruncated = isHourly ? end.truncatedTo(ChronoUnit.HOURS) : end.truncatedTo(ChronoUnit.DAYS);

        while (!current.isAfter(endTruncated)) {
            TimeSeriesProjection point = dbMap.get(current);
            if (point != null) {
                filled.add(new TimeSeriesPointDto(current, point.plays(), point.uniqueListeners(), point.skips(), point.likes()));
            } else {
                filled.add(new TimeSeriesPointDto(current, 0, 0, 0, 0));
            }
            current = isHourly ? current.plusHours(1) : current.plusDays(1);
        }
        return filled;
    }


    /**
     * Normalizes the timestamp to the nearest 5-minute floor.
     * Prevents cache fragmentation aligning with the 5-minute rollup workers.
     */
    private OffsetDateTime snapToFiveMinutes(OffsetDateTime dateTime) {
        long epochSeconds = dateTime.toEpochSecond();
        long snappedSeconds = epochSeconds - (epochSeconds % 300);
        return OffsetDateTime.ofInstant(java.time.Instant.ofEpochSecond(snappedSeconds), dateTime.getOffset());
    }
}