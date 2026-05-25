export type LibraryItemType = 'OWNED_PLAYLIST' | 'FOLLOWED_PLAYLIST' | 'FOLLOWED_PROFILE';

export interface LibraryItemDto {
    id: string;
    type: LibraryItemType;
    title: string;
    imageUrl: string | null;
    subtitle: string;
    addedAt: string;
}