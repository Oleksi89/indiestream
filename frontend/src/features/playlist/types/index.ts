export interface PlaylistDto {
    id: string;
    ownerId: string;
    name: string;
    description: string | null;
    coverMinioPath: string | null;
    isPublic: boolean;
    isSystem: boolean;
    isCollaborative: boolean;
    trackCount: number;
    totalDurationSeconds: number;
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
    durationSeconds: number;
    coverMinioPath: string | null;
    addedByUserId: string;
    addedAt: string;
}


export interface TrackMetadataPayload {
    id: string;
    title: string;
    artistId: string;
    durationSeconds: number;
    coverMinioPath: string | null;
}