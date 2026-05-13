export interface TrackDto {
    id: string;
    artistId: string;
    title: string;
    artistAlias: string;
    minioBucketPath: string;
    coverMinioPath?: string | null;
    stemsMetadata: Record<string, string>;
    durationSeconds: number;
}

export interface UploadTrackRequest {
    title: string;
    file: FileList;
    cover?: FileList;
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