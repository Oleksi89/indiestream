import type {TrackDto} from '@/features/media/types';

export type AnalyticsTimeRange = 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'ALL_TIME';

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
}

export interface ArtistOverviewDto {
    summary: SummaryMetricsDto;
    engagement: EngagementMetricsDto;
    topTracks: TopPerformingTrackDto[];
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
    rawCount: number;
    percentage: number;
}

export interface RegionStatDto {
    countryOrCity: string;
    listeners: number;
}

export interface TrackAnalyticsResponseDto {
    summary: SummaryMetricsDto;
    engagement: EngagementMetricsDto;
    timeSeries: TimeSeriesPointDto[];
    attribution: AttributionMetricDto[];
    demographics: RegionStatDto[];
    currentConcurrentListeners: number;
}

export interface ListeningHistoryItemDto {
    track: TrackDto;
    lastPlayedAt: string;
    totalListenedTimeMs: number;
}