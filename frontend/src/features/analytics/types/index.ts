import type {TrackDto} from '@/features/media/types';

export interface SummaryMetricsDto {
    totalPlays: number;
    playsGrowthPercentage: number;
    totalLikes: number;
    likesGrowthPercentage: number;
    uniqueListeners: number;
    listenersGrowthPercentage: number;
}

export interface EngagementMetricsDto {
    skipRatePercentage: number;
    completionRatePercentage: number;
    saveToPlaylistRatePercentage: number;
}

export interface TopPerformingTrackDto {
    trackId: string;
    title: string;
    coverMinioPath: string | null;
    plays: number;
    uniqueListeners: number;
    skipRate: number;
    popularityScore: number;
}

export interface ArtistOverviewDto {
    summary: SummaryMetricsDto;
    engagement: EngagementMetricsDto;
    topTracks: TopPerformingTrackDto[];
}

export interface PlaylistOverviewDto {
    summary: SummaryMetricsDto;
    engagement: EngagementMetricsDto;
}

export interface PlatformOverviewDto {
    summary: SummaryMetricsDto;
    engagement: EngagementMetricsDto;
}

export interface TimeSeriesPointDto {
    timestamp: string; // ISO-8601 OffsetDateTime
    plays: number;
    uniqueListeners: number;
    skips: number;
    likes: number;
}

export interface AttributionMetricDto {
    sourceType: string;
    count: number;
    percentage: number;
}

export interface RegionStatDto {
    countryOrCity: string;
    listeners: number;
    percentage: number;
}

export interface TrackAnalyticsResponseDto {
    trackTitle: string;
    coverMinioPath: string | null;
    popularityScore: number;
    summary: SummaryMetricsDto;
    engagement: EngagementMetricsDto;
    timeSeries: TimeSeriesPointDto[];
    attribution: AttributionMetricDto[];
    demographics: RegionStatDto[];
    currentConcurrentListeners: number;
}

export interface ListeningHistoryItemDto {
    track: TrackDto;
    lastPlayedAt: string; // ISO-8601 OffsetDateTime
    totalListenedTimeMs: number;
}