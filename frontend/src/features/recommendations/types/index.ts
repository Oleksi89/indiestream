import type {TrackDto} from '@/features/media/types';
import type {PlaylistDto} from '@/features/playlist/types';

/**
 * Defines the context mapping for the AI Autoplay engine.
 */
export type AutoplayMode = 'PLAYLIST' | 'TASTE';

/**
 * Composite DTO representing the multi-lane discovery interface.
 * Transports hydrated public contracts from adjacent backend modules.
 */
export interface DiscoveryShelvesDto {
    madeForYou: TrackDto[];
    discoverPlaylists: PlaylistDto[];
    listenersLikeYou: TrackDto[];
}