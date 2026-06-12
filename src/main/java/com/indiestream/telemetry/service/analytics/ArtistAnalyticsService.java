package com.indiestream.telemetry.service.analytics;

import com.indiestream.telemetry.domain.AnalyticsTimeRange;
import com.indiestream.telemetry.dto.analytics.*;
import com.indiestream.telemetry.repository.AnalyticsQueryRepository;
import com.indiestream.telemetry.repository.projection.AggregateMetricsProjection;
import com.indiestream.telemetry.service.LivePulseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;
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

    // Modern solution to AOP Proxy bypass without field injection
    private final ObjectProvider<ArtistAnalyticsService> selfProvider;

    @Cacheable(value = "analytics:historical", key = "#artistId + '-overview-' + #timeRange.name()")
    public ArtistOverviewDto getArtistGlobalOverview(UUID artistId, AnalyticsTimeRange timeRange) {
        AggregateMetricsProjection current = queryRepository.getArtistGlobalMetrics(
                artistId, timeRange.getCurrentStartOffset(), timeRange.getCurrentEndOffset());

        AggregateMetricsProjection prev = queryRepository.getArtistGlobalMetrics(
                artistId, timeRange.getPreviousStartOffset(), timeRange.getPreviousEndOffset());

        SummaryMetricsDto summary = GrowthCalculator.buildSummary(current, prev);
        EngagementMetricsDto engagement = GrowthCalculator.buildEngagement(current);

        List<TopPerformingTrackDto> topTracks = queryRepository.getTopTracksForArtist(
                        artistId, timeRange.getCurrentStartOffset(), timeRange.getCurrentEndOffset(), 5)
                .stream()
                .map(t -> new TopPerformingTrackDto(
                        t.trackId(), t.title(), t.coverMinioPath(), t.plays(), t.uniqueListeners(),
                        t.plays() > 0 ? (t.skips() / (double) t.plays()) * 100.0 : 0.0
                )).collect(Collectors.toList());

        return new ArtistOverviewDto(summary, engagement, topTracks);
    }

    /**
     * CACHED: Computes heavy historical track statistics.
     */
    @Cacheable(value = "analytics:historical", key = "#artistId + '-' + #trackId + '-' + #timeRange.name()")
    public TrackAnalyticsResponseDto getTrackHistoricalAnalytics(UUID trackId, UUID artistId, AnalyticsTimeRange timeRange) {
        AggregateMetricsProjection current = queryRepository.getTrackMetrics(
                trackId, artistId, timeRange.getCurrentStartOffset(), timeRange.getCurrentEndOffset());

        AggregateMetricsProjection prev = queryRepository.getTrackMetrics(
                trackId, artistId, timeRange.getPreviousStartOffset(), timeRange.getPreviousEndOffset());

        SummaryMetricsDto summary = GrowthCalculator.buildSummary(current, prev);
        EngagementMetricsDto engagement = GrowthCalculator.buildEngagement(current);

        List<TimeSeriesPointDto> timeSeries = queryRepository.getTrackTimeSeries(
                        trackId, artistId, timeRange.getCurrentStartOffset(), timeRange.getCurrentEndOffset())
                .stream()
                .map(ts -> new TimeSeriesPointDto(
                        ts.dateTimestamp().atStartOfDay().atOffset(java.time.ZoneOffset.UTC),
                        ts.plays(), ts.uniqueListeners(), ts.skips(), ts.likes()
                )).collect(Collectors.toList());

        List<AttributionMetricDto> attribution = queryRepository.getTrackAttribution(
                        trackId, artistId, timeRange.getCurrentStartOffset(), timeRange.getCurrentEndOffset())
                .stream()
                .map(attr -> new AttributionMetricDto(
                        attr.sourceType(), attr.count(),
                        current.totalPlays() > 0 ? (attr.count() / (double) current.totalPlays()) * 100.0 : 0.0
                )).collect(Collectors.toList());

        // Safe calculation for percentageOfTotal
        List<RegionStatDto> demographics = queryRepository.getTrackDemographics(
                        trackId, artistId, timeRange.getCurrentStartOffset(), timeRange.getCurrentEndOffset())
                .stream()
                .map(geo -> new RegionStatDto(
                        geo.countryOrCity(),
                        geo.listeners(),
                        current.uniqueListeners() > 0 ? (geo.listeners() / (double) current.uniqueListeners()) * 100.0 : 0.0
                ))
                .collect(Collectors.toList());

        return new TrackAnalyticsResponseDto(summary, engagement, timeSeries, attribution, demographics, 0);
    }

    /**
     * HYBRID: Fetches the cached historical data and appends the live concurrent listener count.
     * This method itself is NOT cached.
     */
    public TrackAnalyticsResponseDto getTrackAnalyticsWithRealTime(UUID trackId, UUID artistId, AnalyticsTimeRange timeRange) {
        // Utilizing ObjectProvider to safely call the @Cacheable method through the Spring AOP Proxy
        TrackAnalyticsResponseDto historical = selfProvider.getObject().getTrackHistoricalAnalytics(trackId, artistId, timeRange);

        // Fetch fresh concurrent pulse from Redis ZSET
        long concurrent = livePulseService.getConcurrentListenersCount(trackId);

        return historical.withConcurrentListeners(concurrent);
    }
}