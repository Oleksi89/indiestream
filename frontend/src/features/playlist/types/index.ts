import type {UserPublicProfileDto} from "@/features/auth/types";
import type {TrackTagsDto} from "@/features/media/types";

export interface PlaylistDto {
    id: string;
    ownerId: string;
    ownerUsername: string;
    ownerAlias: string;
    ownerAvatarPath: string | null;
    name: string;
    description: string | null;
    coverMinioPath: string | null;
    isPublic: boolean;
    isSystem: boolean;
    isCollaborative: boolean;
    trackCount: number;
    totalDurationSeconds: number;
    followersCount: number;
    collaborators: UserPublicProfileDto[];
    createdAt: string;
    updatedAt: string | null;
}

export interface CreatePlaylistPayload {
    name: string;
    description?: string;
    isPublic: boolean;
    isCollaborative: boolean;
}

export interface UpdatePlaylistPayload {
    name?: string;
    description?: string;
    isPublic?: boolean;
    isCollaborative?: boolean;
}

// Generic interface to map Spring Data Page<T> response
export interface PageResponse<T> {
    content: T[];
    page: {
        size: number;
        number: number;
        totalElements: number;
        totalPages: number;
    };
}

export interface PlaylistTrackDto {
    trackId: string;
    title: string;
    artistId: string;
    artistUsername: string;
    artistAlias: string;
    durationSeconds: number;
    coverMinioPath: string | null;
    stemsMetadata: Record<string, string>;
    addedByUserId: string;
    addedAt: string;
    // Semantic Metadata
    genre?: string;
    isExplicit?: boolean;
    tags?: TrackTagsDto;
}


export interface TrackMetadataPayload {
    id: string;
    title: string;
    artistId: string;
    artistUsername: string;
    artistAlias: string;
    durationSeconds: number;
    stemsMetadata: Record<string, string>;
    coverMinioPath: string | null;
    // Semantic Metadata
    genre?: string;
    isExplicit?: boolean;
    tags?: TrackTagsDto;
}