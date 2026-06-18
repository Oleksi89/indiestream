import React, {useState, useRef, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import * as Popover from '@radix-ui/react-popover';
import {Search, Loader2, ArrowRight} from 'lucide-react';
import {useQuickSearch} from '../hooks/useSearch';
import {TrackCard} from '@/features/media/ui/TrackCard';
import {LibraryItem} from '@/features/playlist/ui/LibraryItem';
import type {SearchProfileDto, SearchTrackDto} from '../types';
import type {LibraryItemDto} from '@/features/library/types';
import type {TrackDto} from '@/features/media/types';
import {TrackContextMenu} from "@/features/media/ui/TrackContextMenu.tsx";
import {PlaylistContextMenu} from "@/features/playlist/ui/PlaylistContextMenu.tsx";
import {useTranslation} from '@/shared/lib/i18n/useTranslation';

export const QuickSearchPopover = () => {
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();
    const {t} = useTranslation();

    const {data, isLoading, isFetching} = useQuickSearch(inputValue);

    const hasQuery = inputValue.trim().length >= 2;
    const hasResults = data && (data.tracks.length > 0 || data.playlists.length > 0 || data.profiles.length > 0);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInputValue(val);
        if (val.trim().length >= 2) {
            setOpen(true);
        } else {
            setOpen(false);
        }
    };

    // Close popover when navigating away
    useEffect(() => {
        setOpen(false);
    }, [navigate]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            setOpen(false);
            navigate(`/search?q=${encodeURIComponent(inputValue.trim())}`);
        }
    };

    // Mappers to adapt Search DTOs to polymorphic UI components
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
        tags: t.tags
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

    const renderSkeletons = () => (
        <div className="space-y-4 p-2">
            <div>
                <div className="h-4 w-20 bg-slate-800 rounded animate-pulse mb-3 ml-2"/>
                {[1, 2].map(i => (
                    <div key={i} className="flex items-center gap-3 p-2 w-full mb-1">
                        <div className="h-10 w-10 shrink-0 rounded bg-slate-800 animate-pulse"/>
                        <div className="flex flex-col gap-2 w-full">
                            <div className="h-3 w-3/4 bg-slate-800 rounded animate-pulse"/>
                            <div className="h-2 w-1/2 bg-slate-800 rounded animate-pulse"/>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Anchor className="relative flex items-center w-full max-w-sm">
                <Search className="absolute left-3 w-4 h-4 text-slate-500"/>
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onClick={() => {
                        if (hasQuery) setOpen(true);
                    }}
                    onFocus={() => hasQuery && setOpen(true)}
                    placeholder={t.search.quickSearchPlaceholder}
                    className="w-full bg-slate-900 border border-slate-800 rounded-full py-2 pl-10 pr-10 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all"
                />
                {isFetching && (
                    <Loader2 className="absolute right-3 w-4 h-4 text-violet-500 animate-spin"/>
                )}
            </Popover.Anchor>

            <Popover.Content
                onOpenAutoFocus={(e) => e.preventDefault()}
                className="z-50 w-[384px] max-h-[80vh] overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/95 backdrop-blur-xl p-2 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2"
                sideOffset={8}
            >
                {isLoading ? (
                    renderSkeletons()
                ) : !hasResults ? (
                    <div className="p-8 text-center text-sm text-slate-500">
                        {t.search.noResultsFor} "{inputValue}"
                    </div>
                ) : (
                    <div className="space-y-4 pb-2">
                        {data.tracks.length > 0 && (
                            <div className="space-y-1">
                                <h3 className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">{t.search.tabs.tracks}</h3>
                                {data.tracks.map((track) => {
                                    const trackDto = mapTrackToDto(track);
                                    return (
                                        <TrackContextMenu key={track.id} track={trackDto}>
                                            <TrackCard
                                                track={trackDto}
                                                variant="compact"
                                            />
                                        </TrackContextMenu>
                                    );
                                })}
                            </div>
                        )}

                        {data.profiles.length > 0 && (
                            <div className="space-y-1">
                                <h3 className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">{t.search.tabs.artists}</h3>
                                {data.profiles.map((profile) => (
                                    <LibraryItem
                                        key={profile.id}
                                        item={mapProfileToLibraryItem(profile)}
                                        viewMode="normal"
                                        onClick={() => navigate(`/user/${profile.username}`)}
                                    />
                                ))}
                            </div>
                        )}

                        {data.playlists.length > 0 && (
                            <div className="space-y-1">
                                <h3 className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">{t.search.tabs.playlists}</h3>
                                {data.playlists.map((playlist) => (
                                    <PlaylistContextMenu key={playlist.id} playlist={playlist}>
                                        <LibraryItem
                                            playlist={playlist}
                                            viewMode="normal"
                                            onClick={() => navigate(`/playlist/${playlist.id}`)}
                                        />
                                    </PlaylistContextMenu>
                                ))}
                            </div>
                        )}

                        <div className="pt-2 px-1 border-t border-slate-800">
                            <button
                                onClick={() => {
                                    setOpen(false);
                                    navigate(`/search?q=${encodeURIComponent(inputValue.trim())}`);
                                }}
                                className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-300 hover:text-violet-400 hover:bg-slate-800/50 rounded-lg transition-colors"
                            >
                                <span>{t.search.seeAllResults} "{inputValue}"</span>
                                <ArrowRight size={16}/>
                            </button>
                        </div>
                    </div>
                )}
            </Popover.Content>
        </Popover.Root>
    );
};