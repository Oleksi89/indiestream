import React from 'react';
import {Copy, Trash2, Edit3, Users} from 'lucide-react';
import {createPortal} from 'react-dom';
import type {PlaylistDto} from '../types';
import {useDeletePlaylist, useDuplicatePlaylist} from '../hooks/usePlaylists';

interface PlaylistContextMenuProps {
    playlist: PlaylistDto;
    position: { x: number; y: number };
    onClose: () => void;
}

export const PlaylistContextMenu = ({playlist, position, onClose}: PlaylistContextMenuProps) => {
    const deletePlaylist = useDeletePlaylist();
    const duplicatePlaylist = useDuplicatePlaylist();

    const handleAction = (action: () => void) => (e: React.MouseEvent) => {
        e.stopPropagation();
        action();
        onClose();
    };

    const menu = (
        <div
            className="fixed z-[100] w-56 bg-slate-900 border border-slate-700/50 rounded-lg shadow-2xl p-1 animate-in fade-in zoom-in-95 duration-100"
            style={{top: position.y, left: position.x}}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
            }}
        >
            <div className="px-2 py-1.5 border-b border-slate-800/60 mb-1">
                <span className="text-xs font-semibold text-slate-400 truncate block">
                    {playlist.name}
                </span>
            </div>

            <button
                className="w-full flex items-center gap-3 px-2 py-2 text-sm text-slate-200 hover:bg-slate-800 hover:text-white rounded-md transition-colors disabled:opacity-50"
                onClick={handleAction(() => console.log('Open Edit Modal'))}
            >
                <Edit3 className="w-4 h-4"/> Edit details
            </button>
            <button
                className="w-full flex items-center gap-3 px-2 py-2 text-sm text-slate-200 hover:bg-slate-800 hover:text-white rounded-md transition-colors"
                onClick={handleAction(() => duplicatePlaylist.mutate(playlist.id))}
            >
                <Copy className="w-4 h-4"/> Duplicate
            </button>
            <button
                className="w-full flex items-center gap-3 px-2 py-2 text-sm text-slate-200 hover:bg-slate-800 hover:text-white rounded-md transition-colors"
                onClick={handleAction(() => console.log('Make Collaborative'))}
            >
                <Users className="w-4 h-4"/> Collaboration
            </button>

            <div className="my-1 border-t border-slate-800/60"/>

            <button
                className="w-full flex items-center gap-3 px-2 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-md transition-colors"
                onClick={handleAction(() => {
                    if (window.confirm(`Delete "${playlist.name}"?`)) {
                        deletePlaylist.mutate(playlist.id);
                    }
                })}
            >
                <Trash2 className="w-4 h-4"/> Delete
            </button>
        </div>
    );

    // Mount at the root level to escape any localized overflow hidden containers
    return createPortal(menu, document.body);
};