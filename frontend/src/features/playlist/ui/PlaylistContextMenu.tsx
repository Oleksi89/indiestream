import React, {useState} from 'react';
import {
    Trash2, Edit3, Users, UserMinus, UserPlus, ListPlus, Link2,
    CopyPlus, PlusCircle, EyeOff, Eye, User
} from 'lucide-react';
import toast from 'react-hot-toast';
import {useQueryClient} from '@tanstack/react-query';
import type {PlaylistDto} from '../types';
import type {LibraryItemDto} from '@/features/library/types';
import type {TrackDto} from '@/features/media/types';
import {
    useDeletePlaylist, useDuplicatePlaylist, useUnfollowPlaylist,
    useFollowPlaylist, useUpdatePlaylist, playlistKeys
} from '../hooks/usePlaylists';
import {useAuthStore} from '@/shared/store/authStore';
import {usePlayerStore} from '@/shared/store/playerStore';
import {useLibrary} from '@/features/library/hooks/useLibrary';
import {playlistApi} from '../api/playlist.api';
import {EditPlaylistModal} from './EditPlaylistModal';
import {CollaboratorsModal} from './CollaboratorsModal';
import {
    ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem,
    ContextMenuSeparator, ContextMenuSub, ContextMenuSubTrigger, ContextMenuSubContent
} from '@/shared/ui/ContextMenu';

interface PlaylistContextMenuProps {
    playlist?: PlaylistDto;
    item?: LibraryItemDto;
    children: React.ReactNode;
}

export const PlaylistContextMenu = ({playlist, item, children}: PlaylistContextMenuProps) => {
    const {user: currentUser} = useAuthStore();
    const {addContextToQueue} = usePlayerStore();
    const queryClient = useQueryClient();

    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isCollabOpen, setIsCollabOpen] = useState(false);

    const deletePlaylist = useDeletePlaylist();
    const duplicatePlaylist = useDuplicatePlaylist();
    const unfollowPlaylist = useUnfollowPlaylist();
    const followPlaylist = useFollowPlaylist();
    const updatePlaylist = useUpdatePlaylist();

    const {data: library} = useLibrary();

    const id = playlist?.id || item?.id;
    const title = playlist?.name || item?.title;

    // --- State Hydration Engine ---
    // If we only have a LibraryItem (e.g. from Sidebar), we attempt to pull full details from the local cache.
    const cachedPlaylist = id ? queryClient.getQueryData<PlaylistDto>(playlistKeys.detail(id)) : undefined;
    const actual = playlist || cachedPlaylist;

    const ownerId = actual?.ownerId || item?.ownerId;
    const isOwner = Boolean(currentUser?.id && ownerId && currentUser.id === ownerId);

    // Strict evaluation of system constraints
    const isSystem = actual?.isSystem ?? (item?.type === 'OWNED_PLAYLIST' && title === 'Liked Tracks');

    const isCollaborative = actual?.isCollaborative ?? item?.isCollaborative ?? false;
    const isCollaborator = actual ? actual.collaborators?.some(c => c.id === currentUser?.id) : (item?.isCollaborator ?? false);

    // Collaborators can edit metadata, Owners can do everything
    const canEditMetadata = isOwner || isCollaborator;

    const isPublic = actual?.isPublic ?? false;
    const isFollowed = item?.type === 'FOLLOWED_PLAYLIST' || item?.type === 'COLLABORATED_PLAYLIST';
    const isPublicNotOwned = !isOwner && !isSystem;

    const targetPlaylists = library?.filter(p =>
        p.type === 'OWNED_PLAYLIST' || (p.type === 'COLLABORATED_PLAYLIST' && p.isCollaborator)
    ) || [];

    const handleCopyLink = () => {
        if (!id) return;
        navigator.clipboard.writeText(`${window.location.origin}/playlist/${id}`)
            .then(() => toast.success('Link copied to clipboard'));
    };

    const handleAddToQueue = async () => {
        if (!id) return;
        const toastId = toast.loading('Loading tracks...');
        try {
            const tracksData = await playlistApi.getPlaylistTracks(id, 0, 500);
            const mappedTracks: TrackDto[] = tracksData.content.map(t => ({
                id: t.trackId, title: t.title, artistId: t.artistId, artistUsername: t.artistUsername,
                artistAlias: t.artistAlias, durationSeconds: t.durationSeconds, coverMinioPath: t.coverMinioPath,
                stemsMetadata: t.stemsMetadata, minioBucketPath: ''
            }));
            if (mappedTracks.length === 0) {
                toast.error('Playlist is empty', {id: toastId});
                return;
            }
            addContextToQueue(mappedTracks);
            toast.success(`Added ${mappedTracks.length} tracks to queue`, {id: toastId});
        } catch {
            toast.error('Failed to load playlist tracks', {id: toastId});
        }
    };

    const handleBulkAddToTargetPlaylist = async (targetPlaylistId: string) => {
        if (!id) return;
        const toastId = toast.loading('Synchronizing tracks...');
        try {
            const tracksData = await playlistApi.getPlaylistTracks(id, 0, 500);
            const trackIds = tracksData.content.map(t => t.trackId);
            if (trackIds.length === 0) {
                toast.success('Source playlist is empty', {id: toastId});
                return;
            }
            for (const trackId of trackIds) {
                await playlistApi.addTrack(targetPlaylistId, trackId);
            }
            toast.success('Tracks successfully injected', {id: toastId});
        } catch {
            toast.error('Partial failure during bulk insertion', {id: toastId});
        }
    };

    const handleTogglePrivacy = () => {
        if (!id) return;
        updatePlaylist.mutate({id, payload: {isPublic: !isPublic}});
        toast.success(!isPublic ? 'Playlist is now public' : 'Playlist is now private');
    };

    const handleToggleCollaboration = () => {
        if (!id || isSystem) return;
        updatePlaylist.mutate({id, payload: {isCollaborative: !isCollaborative}});
        toast.success(!isCollaborative ? 'Collaboration enabled' : 'Collaboration disabled');
    };

    const handleDelete = () => {
        if (id && window.confirm(`Delete "${title}" permanently?`)) {
            deletePlaylist.mutate(id);
        }
    };

    const handleUnfollow = () => {
        if (id) unfollowPlaylist.mutate(id);
    };
    const handleFollow = () => {
        if (id) followPlaylist.mutate(id);
    };

    if (!id || !title) return <>{children}</>;

    const activePlaylistDto: PlaylistDto = actual || {
        id, ownerId: ownerId || '', ownerUsername: '', ownerAlias: '', ownerAvatarPath: null,
        name: title, description: null, coverMinioPath: item?.imageUrl || null, isPublic, isSystem,
        isCollaborative, trackCount: 0, totalDurationSeconds: 0, followersCount: 0,
        collaborators: [], createdAt: '', updatedAt: null
    };

    return (
        <>
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    {children}
                </ContextMenuTrigger>

                <ContextMenuContent className="w-60 bg-slate-900 border-slate-800 text-slate-200">
                    <div className="px-3 py-2 mb-1 border-b border-slate-800/60 bg-slate-950/30">
                        <span className="text-xs font-bold text-slate-400 truncate block uppercase tracking-wider">
                            {title}
                        </span>
                    </div>

                    <ContextMenuItem onSelect={handleAddToQueue} className="focus:bg-slate-800 cursor-pointer">
                        <ListPlus className="mr-2 h-4 w-4 text-violet-400"/> Add to Queue
                    </ContextMenuItem>

                    <ContextMenuSeparator className="bg-slate-800"/>

                    {canEditMetadata && !isSystem && (
                        <ContextMenuItem onSelect={() => setIsEditOpen(true)}
                                         className="focus:bg-slate-800 cursor-pointer">
                            <Edit3 className="mr-2 h-4 w-4"/> Edit details
                        </ContextMenuItem>
                    )}

                    {/* Owner specific logic: Privacy applies to ALL owned playlists, Collab only to custom ones */}
                    {isOwner && (
                        <>
                            <ContextMenuItem onSelect={(e) => {
                                e.preventDefault();
                                handleTogglePrivacy();
                            }} className="focus:bg-slate-800 cursor-pointer">
                                {isPublic ? <EyeOff className="mr-2 h-4 w-4"/> :
                                    <Eye className="mr-2 h-4 w-4"/>}
                                {isPublic ? 'Make Private' : 'Make Public'}
                            </ContextMenuItem>

                            {!isSystem && (
                                <ContextMenuItem onSelect={(e) => {
                                    e.preventDefault();
                                    handleToggleCollaboration();
                                }} className="focus:bg-slate-800 cursor-pointer flex items-center justify-between">
                                    <span className="flex items-center">
                                        {isCollaborative ? <User className="mr-2 h-4 w-4"/> :
                                            <Users className="mr-2 h-4 w-4"/>}
                                        {isCollaborative ? 'Disable Collab' : 'Enable Collab'}
                                    </span>
                                </ContextMenuItem>
                            )}
                            <ContextMenuSeparator className="bg-slate-800"/>
                        </>
                    )}

                    <ContextMenuSub>
                        <ContextMenuSubTrigger className="focus:bg-slate-800 cursor-pointer">
                            <PlusCircle className="mr-2 h-4 w-4"/> Add to Playlist
                        </ContextMenuSubTrigger>
                        <ContextMenuSubContent
                            className="w-48 bg-slate-900 border-slate-800 max-h-[300px] overflow-y-auto custom-scrollbar">
                            {targetPlaylists.length === 0 ? (
                                <div className="px-2 py-3 text-xs text-center text-slate-500">No mutable playlists
                                    available</div>
                            ) : (
                                targetPlaylists.map(target => (
                                    <ContextMenuItem key={target.id}
                                                     onSelect={() => handleBulkAddToTargetPlaylist(target.id)}
                                                     className="focus:bg-slate-800 cursor-pointer truncate text-xs">
                                        {target.title}
                                    </ContextMenuItem>
                                ))
                            )}
                        </ContextMenuSubContent>
                    </ContextMenuSub>

                    <ContextMenuItem onSelect={() => duplicatePlaylist.mutate(id)}
                                     className="focus:bg-slate-800 cursor-pointer">
                        <CopyPlus className="mr-2 h-4 w-4"/> Clone to Library (Copy)
                    </ContextMenuItem>


                    <ContextMenuItem onSelect={handleCopyLink} className="focus:bg-slate-800 cursor-pointer">
                        <Link2 className="mr-2 h-4 w-4"/> Copy Link
                    </ContextMenuItem>

                    <ContextMenuSeparator className="bg-slate-800"/>

                    {isFollowed && (
                        <ContextMenuItem onSelect={handleUnfollow}
                                         className="text-red-400 focus:bg-red-500/10 focus:text-red-300 cursor-pointer">
                            <UserMinus className="mr-2 h-4 w-4"/> Remove from Library
                        </ContextMenuItem>
                    )}

                    {!isFollowed && isPublicNotOwned && (
                        <ContextMenuItem onSelect={handleFollow} className="focus:bg-slate-800 cursor-pointer">
                            <UserPlus className="mr-2 h-4 w-4"/> Save (Follow)
                        </ContextMenuItem>
                    )}

                    {isOwner && !isSystem && (
                        <ContextMenuItem onSelect={handleDelete}
                                         className="text-red-400 focus:bg-red-500/10 focus:text-red-300 cursor-pointer">
                            <Trash2 className="mr-2 h-4 w-4"/> Delete Playlist
                        </ContextMenuItem>
                    )}
                </ContextMenuContent>
            </ContextMenu>

            {isEditOpen && (
                <EditPlaylistModal playlist={activePlaylistDto} isOpen={isEditOpen}
                                   onClose={() => setIsEditOpen(false)}/>
            )}

            {isCollabOpen && currentUser && (
                <CollaboratorsModal playlist={activePlaylistDto} currentUserId={currentUser.id} isOpen={isCollabOpen}
                                    onClose={() => setIsCollabOpen(false)}/>
            )}
        </>
    );
};