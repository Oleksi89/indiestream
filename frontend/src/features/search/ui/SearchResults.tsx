import {useNavigate} from 'react-router-dom';
import * as Tabs from '@radix-ui/react-tabs';
import {SearchX, Disc3, Users, ListMusic} from 'lucide-react';
import type {GlobalSearchResponseDto, SearchTrackDto, SearchProfileDto} from '../types';
import type {TrackDto} from '@/features/media/types';
import type {LibraryItemDto} from '@/features/library/types';
import {TrackCard} from '@/features/media/ui/TrackCard';
import {LibraryItem} from '@/features/playlist/ui/LibraryItem';
import {usePlayerStore} from '@/shared/store/playerStore';
import {TrackContextMenu} from "@/features/media/ui/TrackContextMenu.tsx";

interface SearchResultsProps {
    data?: GlobalSearchResponseDto;
    isLoading: boolean;
    hasSearched: boolean;
}

export const SearchResults = ({data, isLoading, hasSearched}: SearchResultsProps) => {
    const navigate = useNavigate();
    const {playContext} = usePlayerStore();

    // --- Mappers ---
    const mapTrackToDto = (t: SearchTrackDto): TrackDto => ({
        id: t.id,
        artistId: t.artistId,
        artistUsername: t.artistUsername,
        artistAlias: t.artistAlias,
        title: t.title,
        minioBucketPath: '',
        coverMinioPath: t.coverMinioPath,
        stemsMetadata: t.stemsMetadata,
        durationSeconds: t.durationSeconds,
        status: 'READY',
        genre: t.genre,
        isExplicit: t.isExplicit,
        tags: t.tags ?? {custom: [], moods: [], aiGenerated: []}
    });

    const mapProfileToLibraryItem = (p: SearchProfileDto): LibraryItemDto => ({
        id: p.id,
        type: 'FOLLOWED_PROFILE',
        title: p.alias,
        subtitle: `@${p.username}`,
        imageUrl: p.avatarPath,
        addedAt: new Date().toISOString(),
        ownerId: p.id,
        isCollaborative: false,
        isCollaborator: false
    });

    // Player Integration
    const handlePlayTrack = (trackId: string) => {
        if (!data || !data.tracks) return;
        const trackDtos = data.tracks.map(mapTrackToDto);
        const startIndex = trackDtos.findIndex(t => t.id === trackId);
        if (startIndex !== -1) {
            playContext(trackDtos, 'search-results', startIndex);
        }
    };

    // Skeletons
    const renderTrackSkeletons = () => (
        <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 p-2 w-full">
                    <div className="h-12 w-12 bg-slate-800 rounded-md animate-pulse shrink-0"/>
                    <div className="flex flex-col gap-2 w-1/3">
                        <div className="h-4 bg-slate-800 rounded animate-pulse"/>
                        <div className="h-3 w-2/3 bg-slate-800 rounded animate-pulse"/>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderGridSkeletons = (isCircular: boolean = false) => (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex flex-col gap-3 p-3 bg-slate-900/40 rounded-xl">
                    <div
                        className={`aspect-square w-full bg-slate-800 animate-pulse ${isCircular ? 'rounded-full' : 'rounded-lg'}`}/>
                    <div className="h-4 w-3/4 mx-auto bg-slate-800 rounded animate-pulse"/>
                    <div className="h-3 w-1/2 mx-auto bg-slate-800 rounded animate-pulse"/>
                </div>
            ))}
        </div>
    );

    // Empty States
    if (!hasSearched && !isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                <SearchX size={48} className="mb-4 opacity-50"/>
                <h3 className="text-lg font-medium text-slate-300">Discover Music</h3>
                <p className="text-sm mt-1">Search for your favorite tracks, artists, or playlists.</p>
            </div>
        );
    }

    const isEmpty = data && data.tracks.length === 0 && data.playlists.length === 0 && data.profiles.length === 0;

    if (isEmpty && !isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                <SearchX size={48} className="mb-4 opacity-50 text-violet-500/50"/>
                <h3 className="text-lg font-medium text-slate-300">No results found</h3>
                <p className="text-sm mt-1">Try adjusting your keywords, tags, or genres.</p>
            </div>
        );
    }

    return (
        <div className="pb-24">
            <Tabs.Content value="all" className="outline-none space-y-12">
                <>
                    {isLoading ? (
                        <div className="space-y-12">
                            <div>
                                <h2 className="text-xl font-bold text-white mb-6">Top Tracks</h2>
                                {renderTrackSkeletons()}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white mb-6">Artists</h2>
                                {renderGridSkeletons(true)}
                            </div>
                        </div>
                    ) : (
                        <>
                            {data?.tracks && data.tracks.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-6 text-slate-300">
                                        <Disc3 className="text-violet-400" size={24}/>
                                        <h2 className="text-xl font-bold text-white">Songs</h2>
                                    </div>
                                    <div className="space-y-1">
                                        {data.tracks.slice(0, 5).map((track, i) => {
                                            const trackDto = mapTrackToDto(track);
                                            return (
                                                <TrackContextMenu key={track.id} track={trackDto}>
                                                    <TrackCard
                                                        track={trackDto}
                                                        variant="list"
                                                        index={i + 1}
                                                        onPlayOverride={() => handlePlayTrack(track.id)}
                                                    />
                                                </TrackContextMenu>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {data?.profiles && data.profiles.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-6 text-slate-300">
                                        <Users className="text-emerald-400" size={24}/>
                                        <h2 className="text-xl font-bold text-white">Artists</h2>
                                    </div>
                                    <div
                                        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                        {data.profiles.slice(0, 5).map((profile) => (
                                            <LibraryItem
                                                key={profile.id}
                                                item={mapProfileToLibraryItem(profile)}
                                                viewMode="expanded"
                                                onClick={() => navigate(`/user/${profile.username}`)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {data?.playlists && data.playlists.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-6 text-slate-300">
                                        <ListMusic className="text-indigo-400" size={24}/>
                                        <h2 className="text-xl font-bold text-white">Playlists</h2>
                                    </div>
                                    <div
                                        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                        {data.playlists.slice(0, 5).map((playlist) => (
                                            <LibraryItem
                                                key={playlist.id}
                                                playlist={playlist}
                                                viewMode="expanded"
                                                onClick={() => navigate(`/playlist/${playlist.id}`)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </>
            </Tabs.Content>

            <Tabs.Content value="tracks" className="outline-none">
                <>
                    {isLoading ? renderTrackSkeletons() : (
                        <div className="space-y-1">
                            {data?.tracks.map((track, i) => {
                                const trackDto = mapTrackToDto(track);
                                return (
                                    <TrackContextMenu key={track.id} track={trackDto}>
                                        <TrackCard
                                            track={trackDto}
                                            variant="list"
                                            index={i + 1}
                                            onPlayOverride={() => handlePlayTrack(track.id)}
                                        />
                                    </TrackContextMenu>
                                );
                            })}
                        </div>
                    )}
                </>
            </Tabs.Content>

            <Tabs.Content value="artists" className="outline-none">
                <>
                    {isLoading ? renderGridSkeletons(true) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            {data?.profiles.map((profile) => (
                                <LibraryItem
                                    key={profile.id}
                                    item={mapProfileToLibraryItem(profile)}
                                    viewMode="expanded"
                                    onClick={() => navigate(`/user/${profile.username}`)}
                                />
                            ))}
                        </div>
                    )}
                </>
            </Tabs.Content>

            <Tabs.Content value="playlists" className="outline-none">
                <>
                    {isLoading ? renderGridSkeletons() : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            {data?.playlists.map((playlist) => (
                                <LibraryItem
                                    key={playlist.id}
                                    playlist={playlist}
                                    viewMode="expanded"
                                    onClick={() => navigate(`/playlist/${playlist.id}`)}
                                />
                            ))}
                        </div>
                    )}
                </>
            </Tabs.Content>
        </div>
    );
};