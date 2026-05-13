import {Lock, Users, Heart} from 'lucide-react';

import {cn} from '@/shared/lib/utils';
import {useContextMenu} from '@/shared/hooks/useContextMenu';
import {PlaylistContextMenu} from './PlaylistContextMenu';
import type {PlaylistDto} from "@/features/playlist/types";

interface LibraryItemProps {
    playlist: PlaylistDto;
    viewMode: 'collapsed' | 'normal' | 'expanded';
    isActive?: boolean;
    onClick: () => void;
}

export const LibraryItem = ({playlist, viewMode, isActive, onClick}: LibraryItemProps) => {
    const isLikedTracks = playlist.isSystem && playlist.name === 'Liked Tracks';

    // Initialize context menu hook
    const {position, isOpen, handleContextMenu, closeMenu} = useContextMenu();

    // Prevent opening context menu for the protected system playlist
    const onRightClick = !isLikedTracks ? handleContextMenu : undefined;

    const renderCover = () => {
        if (isLikedTracks) {
            return <Heart
                className={cn("text-white fill-white", viewMode === 'expanded' ? "w-12 h-12 shadow-sm" : "w-5 h-5")}/>;
        }
        if (playlist.coverMinioPath) {
            return <img src={playlist.coverMinioPath} alt={playlist.name} className="w-full h-full object-cover"/>;
        }
        return <span
            className={cn("font-bold text-slate-600", viewMode === 'expanded' ? "text-4xl" : "text-lg text-slate-400")}>{playlist.name[0]}</span>;
    };

    const renderContent = () => {
        // Renders as a vertical card for the expanded grid
        if (viewMode === 'expanded') {
            return (
                <div
                    onClick={onClick}
                    onContextMenu={onRightClick}
                    className={cn(
                        "group flex flex-col gap-3 p-3 rounded-xl cursor-pointer transition-all duration-300",
                        isActive ? "bg-slate-800/80 shadow-inner" : "bg-slate-900/40 hover:bg-slate-800/60"
                    )}
                >
                    <div className={cn(
                        "aspect-square w-full shrink-0 rounded-lg shadow-md flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-[1.02]",
                        isLikedTracks ? "bg-gradient-to-br from-indigo-600 via-purple-700 to-violet-800" : "bg-slate-800"
                    )}>
                        {renderCover()}
                    </div>
                    <div className="flex flex-col min-w-0 px-1">
                        <h4 className={cn(
                            "text-sm font-semibold truncate flex items-center gap-1.5",
                            isActive ? "text-indigo-400" : "text-slate-100"
                        )}>
                            {playlist.name}
                            {playlist.isSystem && !isLikedTracks && <Lock className="w-3 h-3 opacity-60"/>}
                            {playlist.isCollaborative && <Users className="w-3 h-3 text-emerald-400"/>}
                        </h4>
                        <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                            {isLikedTracks ? 'System Playlist' : `Playlist • ${playlist.ownerAlias}`} • {playlist.trackCount} tracks
                        </p>
                    </div>
                </div>
            );
        }

        // Renders as a standard horizontal row for normal/collapsed
        return (
            <div
                onClick={onClick}
                onContextMenu={onRightClick}
                className={cn(
                    "group flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all duration-200",
                    isActive ? "bg-slate-800/80 shadow-inner" : "hover:bg-slate-800/40",
                    viewMode === 'collapsed' ? "justify-center" : ""
                )}
            >
                <div className={cn(
                    "w-12 h-12 shrink-0 rounded-md shadow-sm flex items-center justify-center overflow-hidden",
                    isLikedTracks ? "bg-gradient-to-br from-indigo-600 via-purple-700 to-violet-800" : "bg-slate-800"
                )}>
                    {renderCover()}
                </div>

                {viewMode !== 'collapsed' && (
                    <div className="flex-1 min-w-0">
                        <h4 className={cn(
                            "text-sm font-semibold truncate flex items-center gap-1.5",
                            isActive ? "text-indigo-400" : "text-slate-100"
                        )}>
                            {playlist.name}
                            {playlist.isSystem && !isLikedTracks && <Lock className="w-3 h-3 opacity-60"/>}
                            {playlist.isCollaborative && <Users className="w-3 h-3 text-emerald-400"/>}
                        </h4>
                        <p className="text-xs text-slate-500 font-medium truncate">
                            {isLikedTracks ? 'System Playlist' : 'Playlist • ${playlist.ownerAlias}'} • {playlist.trackCount} tracks
                        </p>
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            {renderContent()}

            {/* Render Context Menu Portal if open */}
            {isOpen && !isLikedTracks && (
                <PlaylistContextMenu
                    playlist={playlist}
                    position={position}
                    onClose={closeMenu}
                />
            )}
        </>
    );
};