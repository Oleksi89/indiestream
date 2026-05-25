import React from 'react';
import {Copy, Trash2, Edit3, Users, UserMinus, UserPlus} from 'lucide-react';
import type {PlaylistDto} from '../types';
import type {LibraryItemDto} from '@/features/library/types';
import {useDeletePlaylist, useDuplicatePlaylist, useUnfollowPlaylist, useFollowPlaylist} from '../hooks/usePlaylists';
import {useAuthStore} from '@/shared/store/authStore';
import {
    ContextMenu,
    ContextMenuTrigger,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator
} from '@/shared/ui/ContextMenu';

interface PlaylistContextMenuProps {
    playlist?: PlaylistDto;
    item?: LibraryItemDto;
    children: React.ReactNode;
}

export const PlaylistContextMenu = ({playlist, item, children}: PlaylistContextMenuProps) => {
    const {user: currentUser} = useAuthStore();
    const deletePlaylist = useDeletePlaylist();
    const duplicatePlaylist = useDuplicatePlaylist();
    const unfollowPlaylist = useUnfollowPlaylist();
    const followPlaylist = useFollowPlaylist();

    const id = playlist?.id || item?.id;
    const title = playlist?.name || item?.title;
    const isSystem = playlist?.isSystem || false;

    // Ідентифікація власника (працює як для сайдбару, так і для Profile Page)
    const isOwner = playlist
        ? playlist.ownerId === currentUser?.id
        : item?.type === 'OWNED_PLAYLIST';

    // Ідентифікація стану підписки (Sidebar item АБО optimistic state)
    const isFollowed = item?.type === 'FOLLOWED_PLAYLIST' || (playlist && (playlist as any).isFollowedByMe);

    // Дозволяємо підписатися, якщо це чужий публічний плейлист
    const isPublicNotOwned = playlist && !isOwner && !playlist.isSystem;

    const handleDelete = () => {
        if (id && window.confirm(`Delete "${title}"?`)) deletePlaylist.mutate(id);
    };

    const handleUnfollow = () => {
        if (id && window.confirm(`Unfollow "${title}"?`)) unfollowPlaylist.mutate(id);
    };

    const handleFollow = () => {
        if (id) followPlaylist.mutate(id);
    };

    if (!id || !title) return <>{children}</>;

    return (
        <ContextMenu>
            {/* asChild вимагає, щоб children був прямим DOM-елементом */}
            <ContextMenuTrigger asChild>
                {children}
            </ContextMenuTrigger>
            <ContextMenuContent className="w-56">
                <div className="px-2 py-1.5 mb-1">
                    <span className="text-xs font-semibold text-slate-400 truncate block">
                        {title}
                    </span>
                </div>
                <ContextMenuSeparator/>

                {isOwner && (
                    <>
                        <ContextMenuItem onClick={() => console.log('Open Edit Modal')}>
                            <Edit3 className="mr-2 h-4 w-4"/> Edit details
                        </ContextMenuItem>
                        <ContextMenuItem onClick={() => duplicatePlaylist.mutate(id)}>
                            <Copy className="mr-2 h-4 w-4"/> Duplicate
                        </ContextMenuItem>
                        <ContextMenuItem onClick={() => console.log('Make Collaborative')}>
                            <Users className="mr-2 h-4 w-4"/> Collaboration
                        </ContextMenuItem>

                        {!isSystem && (
                            <>
                                <ContextMenuSeparator/>
                                <ContextMenuItem onClick={handleDelete}
                                                 className="text-red-400 focus:bg-red-500/10 focus:text-red-300">
                                    <Trash2 className="mr-2 h-4 w-4"/> Delete
                                </ContextMenuItem>
                            </>
                        )}
                    </>
                )}

                {/* Соціальні дії для чужих плейлистів */}
                {isFollowed && (
                    <ContextMenuItem onClick={handleUnfollow}
                                     className="text-red-400 focus:bg-red-500/10 focus:text-red-300">
                        <UserMinus className="mr-2 h-4 w-4"/> Unfollow
                    </ContextMenuItem>
                )}

                {!isFollowed && isPublicNotOwned && (
                    <ContextMenuItem onClick={handleFollow}>
                        <UserPlus className="mr-2 h-4 w-4"/> Follow
                    </ContextMenuItem>
                )}
            </ContextMenuContent>
        </ContextMenu>
    );
};