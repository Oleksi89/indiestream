export interface TrackDto {
    id: string;
    artistId: string;
    title: string;
    minioBucketPath: string;
    stemsMetadata: Record<string, string>;
    durationSeconds: number;
}

export interface UploadTrackRequest {
    title: string;
    file: FileList;
}