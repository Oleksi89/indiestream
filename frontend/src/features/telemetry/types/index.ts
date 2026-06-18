/**
 * Strict Domain Types for Client-Side Telemetry.
 * Must perfectly match the Backend Spring Modulith DTOs.
 */

export type InteractionType =
    | 'LIKE'
    | 'SHARE'
    | 'ADD_TO_PLAYLIST'
    | 'FOLLOW_USER'
    | 'FOLLOW_PLAYLIST'
    | 'TRACK_SKIP';

export type TelemetrySourceType =
    | 'SEARCH'
    | 'PLAYLIST'
    | 'ALBUM'
    | 'PROFILE'
    | 'PUBLIC_FEED'
    | 'EXTERNAL_SHARE'
    | 'SYSTEM_RECOMMENDATION'
    | 'SYSTEM_INTERNAL'; // mute analytics for admin/artist dashboards

export type UiSurface =
    | 'CONTEXT_MENU'
    | 'PLAYER_BAR'
    | 'TRACK_CARD'
    | 'QUICK_SEARCH_POPOVER'
    | 'LIBRARY_SIDEBAR'
    | 'UPLOAD_WIZARD'
    | 'DROPDOWN_MENU';

export interface PlaybackTelemetryPayload {
    eventId: string;
    trackId: string;
    sessionId: string;
    startPositionMs: number;
    endPositionMs: number;
    playbackDurationMs: number;
    sourceType: TelemetrySourceType;
    sourceId?: string;
}

export interface InteractionTelemetryPayload {
    eventId: string;
    targetId: string;
    interactionType: InteractionType;
    sourceType: TelemetrySourceType;
    uiSurface: UiSurface;
}

/**
 * Represents a continuous chunk of playback.
 * Used to calculate exact duration even if the user scrubs/seeks through the track.
 */
export interface TimeRange {
    startMs: number;
    endMs: number;
}