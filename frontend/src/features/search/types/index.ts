import type {PlaylistDto} from '@/features/playlist/types';
import type {TrackTagsDto} from "@/features/media/types";

// Subset of UserProfile mapped for Global Search
export interface SearchProfileDto {
    id: string;
    username: string;
    alias: string;
    avatarPath: string | null;
}

// TrackMetadata projected from MediaModuleApi
export interface SearchTrackDto {
    id: string;
    title: string;
    artistId: string;
    artistUsername: string;
    artistAlias: string;
    durationSeconds: number;
    stemsMetadata: Record<string, string>;
    coverMinioPath: string | null;
    genre?: string;
    isExplicit?: boolean;
    tags?: TrackTagsDto;
}

export interface GlobalSearchResponseDto {
    tracks: SearchTrackDto[];
    playlists: PlaylistDto[];
    profiles: SearchProfileDto[];
}