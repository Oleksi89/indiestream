export interface TrackTagsDto {
    custom: string[];
    moods: string[];
    aiGenerated: string[];
}

export interface TrackDto {
    id: string;
    artistId: string;
    artistUsername: string;
    artistAlias: string;
    title: string;
    minioBucketPath: string;
    coverMinioPath?: string | null;
    stemsMetadata: Record<string, string>;
    durationSeconds: number;
    status: 'PROCESSING' | 'READY' | 'FAILED';
    hlsManifestPath?: string;
    // Semantic Metadata
    genre?: string;
    isExplicit: boolean;
    tags: TrackTagsDto;
}

export interface UploadTrackRequest {
    title: string;
    file: FileList;
    cover?: FileList;
    genre?: string;
    isExplicit?: boolean;
    customTags?: string[];
}

// Generic interface to map Spring Data Page<T> response
export interface PageResponse<T> {
    content: T[];
    totalPages: number;
    totalElements: number;
    size: number;
    number: number;
    empty: boolean;
}

export interface StemUploadPayload {
    name: string;
    file: File;
}

// Allowed Genres for the UI Dropdown
export const AVAILABLE_GENRES = [
    'Alternative', 'Ambient', 'Blues', 'Classical', 'Country',
    'Dance', 'Electronic', 'Folk', 'Hip Hop', 'Indie',
    'Jazz', 'Latin', 'Metal', 'Pop', 'Punk',
    'R&B', 'Reggae', 'Rock', 'Soul', 'Soundtrack',
    'Synthwave', 'Techno', 'Trance', 'World', 'Other'
] as const;