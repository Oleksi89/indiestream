import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Library, Plus, Search} from 'lucide-react';
import {useLibrary} from '@/features/library/hooks/useLibrary';
import {LibraryItem} from './LibraryItem';
import {cn} from '@/shared/lib/utils';
import {Button} from '@/shared/ui/button';
import {CreatePlaylistModal} from "@/features/playlist/ui/CreatePlaylistModal.tsx";
import type {LibraryItemDto} from '@/features/library/types';
import type {LibraryFilter} from "@/shared/store/libraryStore.ts";
import {useLibraryStore} from "@/shared/store/libraryStore.ts";

export const LibrarySidebar = () => {
    const navigate = useNavigate();
    const {viewMode, cycleViewMode, activeFilter, setActiveFilter} = useLibraryStore();
    const {data: library, isLoading} = useLibrary();
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Apply Filter & Search Logic
    const filteredLibrary = (library || []).filter((item: LibraryItemDto) => {
        const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter =
            activeFilter === 'ALL' ||
            (activeFilter === 'PLAYLISTS' && (item.type === 'OWNED_PLAYLIST' || item.type === 'FOLLOWED_PLAYLIST' || item.type === 'COLLABORATED_PLAYLIST')) ||
            (activeFilter === 'PROFILES' && item.type === 'FOLLOWED_PROFILE');
        return matchesSearch && matchesFilter;
    });

    const handleItemClick = (item: LibraryItemDto) => {
        if (item.type === 'FOLLOWED_PROFILE') {
            // Extract username from "Profile • @username" format created by the BFF
            const username = item.subtitle.split('@')[1];
            if (username) navigate(`/user/${username}`);
        } else {
            navigate(`/playlist/${item.id}`);
        }
    };

    const renderSkeletons = () => {
        const skeletonCount = viewMode === 'expanded' ? 6 : 8;
        return Array.from({length: skeletonCount}).map((_, i) => (
            <div
                key={`skeleton-${i}`}
                className={cn(
                    "animate-pulse bg-slate-800/40",
                    viewMode === 'expanded' ? "aspect-square w-full rounded-lg" : "h-14 w-full mb-1 rounded-md"
                )}
            />
        ));
    };

    return (
        <aside className={cn(
            "flex flex-col bg-slate-900 border-r border-slate-700/50 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.5)] z-10 transition-all duration-300 ease-in-out",
            viewMode === 'collapsed' ? "w-[78px]" : viewMode === 'normal' ? "w-[300px]" : "w-[480px]"
        )}>
            <div className="p-5 flex items-center justify-between shrink-0">
                <button onClick={cycleViewMode} className="flex items-center gap-3 group outline-none">
                    <Library className="w-6 h-6 text-slate-400 group-hover:text-indigo-400 transition-colors shrink-0"/>
                    {viewMode !== 'collapsed' && (
                        <span className="font-bold text-base tracking-tight truncate">Your Library</span>
                    )}
                </button>
                {viewMode !== 'collapsed' && (
                    <Button variant="ghost" size="icon" onClick={() => setIsCreateModalOpen(true)}
                            className="hover:bg-slate-800 rounded-full w-8 h-8 shrink-0">
                        <Plus className="w-5 h-5"/>
                    </Button>
                )}
            </div>

            {/* Search Input */}
            {viewMode !== 'collapsed' && (
                <div className="px-4 pb-2 shrink-0 flex flex-col gap-3">
                    {/* Horizontal Pill Filters */}
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                        {(['ALL', 'PLAYLISTS', 'PROFILES'] as LibraryFilter[]).map(filter => (
                            <button
                                key={filter}
                                onClick={() => setActiveFilter(filter)}
                                className={cn(
                                    "px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors",
                                    activeFilter === filter
                                        ? "bg-white text-black"
                                        : "bg-slate-800 text-white hover:bg-slate-700"
                                )}
                            >
                                {filter.charAt(0) + filter.slice(1).toLowerCase()}
                            </button>
                        ))}
                    </div>

                    <div className="relative group">
                        <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors"/>
                        <input
                            type="text"
                            placeholder="Search in Library..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-950/50 border border-slate-800 rounded-md py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 placeholder:text-slate-600 transition-all"
                        />
                    </div>
                </div>
            )}

            {/* Content Area */}
            <div className={cn(
                "flex-1 overflow-y-auto px-3 pb-6 mt-2 scrollbar-thin scrollbar-thumb-slate-800",
                viewMode === 'expanded' ? "grid grid-cols-2 lg:grid-cols-3 gap-3 content-start" : "flex flex-col space-y-1"
            )}>
                {isLoading ? renderSkeletons() : (
                    filteredLibrary.map(item => (
                        <LibraryItem
                            key={item.id}
                            item={item}
                            viewMode={viewMode}
                            onClick={() => handleItemClick(item)}
                        />
                    ))
                )}
            </div>

            <CreatePlaylistModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)}/>
        </aside>
    );
};