package com.indiestream.telemetry.service.analytics;

import com.indiestream.media.api.MediaModuleApi;
import com.indiestream.media.api.TrackMetadata;
import com.indiestream.telemetry.dto.analytics.*;
import com.indiestream.telemetry.repository.AnalyticsQueryRepository;
import com.indiestream.telemetry.repository.projection.AggregateMetricsProjection;
import com.indiestream.telemetry.repository.projection.TimeSeriesProjection;
import com.indiestream.telemetry.repository.projection.TrackAnalyticsMetadataProjection;
import com.indiestream.telemetry.service.LivePulseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Orchestrates heavy native queries into rich analytical models for Artists.
 * Utilizes Redis caching for historical data to protect the Data Warehouse.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ArtistAnalyticsService {

    private final AnalyticsQueryRepository queryRepository;
    private final LivePulseService livePulseService;
    private final MediaModuleApi mediaModuleApi;

    // Solution to AOP Proxy bypass without field injection
    private final ObjectProvider<ArtistAnalyticsService> selfProvider;

    @Cacheable(value = "analytics:historical", key = "#artistId + '-overview-' + #startDate.toEpochSecond() + '-' + #endDate.toEpochSecond()")
    public ArtistOverviewDto getArtistGlobalOverview(UUID artistId, OffsetDateTime startDate, OffsetDateTime endDate) {
        long durationSeconds = ChronoUnit.SECONDS.between(startDate, endDate);
        OffsetDateTime prevStart = startDate.minusSeconds(durationSeconds);
        OffsetDateTime prevEnd = startDate.minusNanos(1000000);

        AggregateMetricsProjection current = queryRepository.getArtistGlobalMetrics(artistId, startDate, endDate);
        AggregateMetricsProjection prev = queryRepository.getArtistGlobalMetrics(artistId, prevStart, prevEnd);

        SummaryMetricsDto summary = GrowthCalculator.buildSummary(current, prev);
        EngagementMetricsDto engagement = GrowthCalculator.buildEngagement(current);

        List<TopPerformingTrackDto> topTracks = queryRepository.getTopTracksForArtist(artistId, startDate, endDate, 5)
                .stream()
                .map(t -> new TopPerformingTrackDto(
                        t.trackId(), t.title(), t.coverMinioPath(), t.plays(), t.uniqueListeners(),
                        t.plays() > 0 ? (t.skips() / (double) t.plays()) * 100.0 : 0.0,
                        t.popularityScore()
                )).collect(Collectors.toList());

        return new ArtistOverviewDto(summary, engagement, topTracks);
    }

    /**
     * CACHED: Computes heavy historical track statistics.
     */
    @Cacheable(value = "analytics:historical", key = "#artistId + '-' + #trackId + '-' + #startDate.toEpochSecond() + '-' + #endDate.toEpochSecond()")
    public TrackAnalyticsResponseDto getTrackHistoricalAnalytics(UUID trackId, UUID artistId, OffsetDateTime startDate, OffsetDateTime endDate) {
        // Natively fetch metadata alongside internal scores to block public exposure
        TrackAnalyticsMetadataProjection trackMeta = queryRepository.getTrackAnalyticsMetadata(trackId, artistId);

        long durationSeconds = ChronoUnit.SECONDS.between(startDate, endDate);
        OffsetDateTime prevStart = startDate.minusSeconds(durationSeconds);
        OffsetDateTime prevEnd = startDate.minusNanos(1000000);

        AggregateMetricsProjection current = queryRepository.getTrackMetrics(trackId, artistId, startDate, endDate);
        AggregateMetricsProjection prev = queryRepository.getTrackMetrics(trackId, artistId, prevStart, prevEnd);

        SummaryMetricsDto summary = GrowthCalculator.buildSummary(current, prev);
        EngagementMetricsDto engagement = GrowthCalculator.buildEngagement(current);

        List<TimeSeriesProjection> rawTimeSeries = queryRepository.getTrackTimeSeries(trackId, artistId, startDate, endDate);
        List<TimeSeriesPointDto> continuousTimeSeries = fillMissingTimePoints(rawTimeSeries, startDate, endDate);

        List<AttributionMetricDto> attribution = queryRepository.getTrackAttribution(trackId, artistId, startDate, endDate)
                .stream()
                .map(attr -> new AttributionMetricDto(
                        attr.sourceType(), attr.count(),
                        current.totalPlays() > 0 ? (attr.count() / (double) current.totalPlays()) * 100.0 : 0.0
                )).collect(Collectors.toList());

        // Safe calculation for percentageOfTotal
        List<RegionStatDto> demographics = queryRepository.getTrackDemographics(trackId, artistId, startDate, endDate)
                .stream()
                .map(geo -> new RegionStatDto(
                        geo.countryOrCity(), geo.listeners(),
                        current.uniqueListeners() > 0 ? (geo.listeners() / (double) current.uniqueListeners()) * 100.0 : 0.0
                )).collect(Collectors.toList());

        return new TrackAnalyticsResponseDto(
                trackMeta.title(), trackMeta.coverMinioPath(), trackMeta.popularityScore(),
                summary, engagement, continuousTimeSeries, attribution, demographics, 0
        );
    }

    /**
     * HYBRID: Fetches the cached historical data and appends the live concurrent listener count.
     * This method itself is NOT cached.
     */
    public TrackAnalyticsResponseDto getTrackAnalyticsWithRealTime(UUID trackId, UUID artistId, OffsetDateTime startDate, OffsetDateTime endDate) {

        // Utilizing ObjectProvider to safely call the @Cacheable method through the Spring AOP Proxy
        TrackAnalyticsResponseDto historical = selfProvider.getObject().getTrackHistoricalAnalytics(trackId, artistId, startDate, endDate);
        // Fetch fresh concurrent pulse from Redis ZSET
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
}