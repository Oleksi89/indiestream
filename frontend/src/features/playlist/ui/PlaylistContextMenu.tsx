import React from 'react';
import {Copy, Trash2, Edit3, Users} from 'lucide-react';
import type {PlaylistDto} from '../types';
import {useDeletePlaylist, useDuplicatePlaylist} from '../hooks/usePlaylists';
import {
    ContextMenu,
    ContextMenuTrigger,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator
} from '@/shared/ui/ContextMenu';

interface PlaylistContextMenuProps {
    playlist: PlaylistDto;
    children: React.ReactNode;
}

export const PlaylistContextMenu = ({playlist, children}: PlaylistContextMenuProps) => {
    const deletePlaylist = useDeletePlaylist();
    const duplicatePlaylist = useDuplicatePlaylist();

    const handleDelete = () => {
        if (window.confirm(`Delete "${playlist.name}"?`)) {
            deletePlaylist.mutate(playlist.id);
        }
    };

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <div>{children}</div>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-56">
                <div className="px-2 py-1.5 mb-1">
                    <span className="text-xs font-semibold text-slate-400 truncate block">
                        {playlist.name}
                    </span>
                </div>
                <ContextMenuSeparator/>
                <ContextMenuItem onClick={() => console.log('Open Edit Modal')}>
                    <Edit3 className="mr-2 h-4 w-4"/> Edit details
                </ContextMenuItem>
                <ContextMenuItem onClick={() => duplicatePlaylist.mutate(playlist.id)}>
                    <Copy className="mr-2 h-4 w-4"/> Duplicate
                </ContextMenuItem>
                <ContextMenuItem onClick={() => console.log('Make Collaborative')}>
                    <Users className="mr-2 h-4 w-4"/> Collaboration
                </ContextMenuItem>

                {!playlist.isSystem && (
                    <>
                        <ContextMenuSeparator/>
                        <ContextMenuItem
                            onClick={handleDelete}
                            className="text-red-400 focus:bg-red-500/10 focus:text-red-300"
                        >
                            <Trash2 className="mr-2 h-4 w-4"/> Delete
                        </ContextMenuItem>
                    </>
                )}
            </ContextMenuContent>
        </ContextMenu>
    );
};