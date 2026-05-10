import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Library, Plus, Search} from 'lucide-react';
import {useLibraryStore} from '../store/libraryStore';
import {useUserLibrary} from '../hooks/usePlaylists';
import {LibraryItem} from './LibraryItem';
import {cn} from '@/shared/lib/utils';
import {Button} from '@/shared/ui/button';
import {CreatePlaylistModal} from "@/features/playlist/ui/CreatePlaylistModal.tsx";

export const LibrarySidebar = () => {
    const navigate = useNavigate();
    const {viewMode, cycleViewMode} = useLibraryStore();
    const {data: library, isLoading} = useUserLibrary(0, 50);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const likedTracks = library?.content.find(p => p.isSystem && p.name === 'Liked Tracks');
    const otherPlaylists = library?.content.filter(p =>
        p.id !== likedTracks?.id &&
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];


    const renderSkeletons = () => {
        const skeletonCount = viewMode === 'expanded' ? 6 : 8;
        return Array.from({length: skeletonCount}).map((_, i) => (
            <div
                key={`skeleton-${i}`}
                className={cn(
                    "animate-pulse bg-slate-800/40 rounded-lg",
                    viewMode === 'expanded' ? "aspect-[4/5] w-full" : "h-16 w-full mb-1"
                )}
            />
        ));
    };

    return (
        <aside className={cn(
            "flex flex-col bg-slate-900 border-r border-slate-700/50 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.5)] z-10 transition-all duration-300 ease-in-out",
            viewMode === 'collapsed' ? "w-[78px]" : viewMode === 'normal' ? "w-[300px]" : "w-[480px]"
        )}>
            {/* Header */}
            <div className="p-5 flex items-center justify-between">
                <button onClick={cycleViewMode} className="flex items-center gap-3 group outline-none">
                    <Library className="w-6 h-6 text-slate-400 group-hover:text-indigo-400 transition-colors shrink-0"/>
                    {viewMode !== 'collapsed' && (
                        <span className="font-bold text-base tracking-tight truncate">Your Library</span>
                    )}
                </button>
                {viewMode !== 'collapsed' && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsCreateModalOpen(true)}
                        className="hover:bg-slate-800 rounded-full w-8 h-8 shrink-0"
                    >
                        <Plus className="w-5 h-5"/>
                    </Button>
                )}
            </div>

            {/* Search Input */}
            {viewMode !== 'collapsed' && (
                <div className="px-4 pb-4">
                    <div className="relative group">
                        <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors"/>
                        <input
                            type="text"
                            placeholder="Search playlists..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-950/50 border border-slate-800 rounded-md py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 placeholder:text-slate-600 transition-all"
                        />
                    </div>
                </div>
            )}

            {/* Content Area */}
            <div className={cn(
                "flex-1 overflow-y-auto px-3 pb-6 scrollbar-thin scrollbar-thumb-slate-800",
                viewMode === 'expanded' ? "grid grid-cols-2 gap-3 content-start" : "flex flex-col space-y-1"
            )}>
                {isLoading ? renderSkeletons() : (
                    <>
                        {likedTracks && (
                            <LibraryItem
                                playlist={likedTracks}
                                viewMode={viewMode}
                                onClick={() => navigate(`/playlist/${likedTracks.id}`)}
                            />
                        )}
                        {/* Divider for normal mode only */}
                        {likedTracks && viewMode === 'normal' && (
                            <div className="mx-2 my-2 border-b border-slate-800/60"/>
                        )}
                        {otherPlaylists.map(playlist => (
                            <LibraryItem
                                key={playlist.id}
                                playlist={playlist}
                                viewMode={viewMode}
                                onClick={() => navigate(`/playlist/${playlist.id}`)}
                            />
                        ))}
                    </>
                )}
            </div>
            <CreatePlaylistModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />
        </aside>
    );
};