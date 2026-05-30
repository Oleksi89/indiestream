import React, {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {
    Edit3, EyeOff, Eye, Users,
    PlusCircle, CopyPlus, Link2, Trash2, User, ListPlus
} from 'lucide-react';
import toast from 'react-hot-toast';
import type {PlaylistDto} from '../types';
import {
    useDeletePlaylist,
    useDuplicatePlaylist,
    useUpdatePlaylist
} from '../hooks/usePlaylists';
import {useLibrary} from '@/features/library/hooks/useLibrary';
import {playlistApi} from '../api/playlist.api';
import {EditPlaylistModal} from './EditPlaylistModal';
import {CollaboratorsModal} from './CollaboratorsModal';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent
} from '@/shared/ui/DropdownMenu';
import {useAuthStore} from '@/shared/store/authStore';
import type {TrackDto} from "@/features/media/types";
import {usePlayerStore} from "@/shared/store/playerStore.ts";

interface PlaylistDropdownMenuProps {
    playlist: PlaylistDto;
    children: React.ReactNode;
}

export const PlaylistDropdownMenu = ({playlist, children}: PlaylistDropdownMenuProps) => {
    const {addContextToQueue} = usePlayerStore();

    const navigate = useNavigate();
    const {user: currentUser} = useAuthStore();
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isCollabOpen, setIsCollabOpen] = useState(false);

    const updatePlaylist = useUpdatePlaylist();
    const deletePlaylist = useDeletePlaylist();
    const duplicatePlaylist = useDuplicatePlaylist();
    const {data: library} = useLibrary();

    const isOwner = currentUser?.id === playlist.ownerId;
    const isSystem = playlist.isSystem;

    const targetPlaylists = library?.filter(p =>
        p.type === 'OWNED_PLAYLIST' || (p.type === 'COLLABORATED_PLAYLIST' && p.isCollaborator)
    ) || [];

    const handleCopyLink = () => {
        navigator.clipboard.writeText(`${window.location.origin}/playlist/${playlist.id}`)
            .then(() => toast.success('Link copied to clipboard'));
    };

    const handleTogglePrivacy = () => {
        updatePlaylist.mutate({id: playlist.id, payload: {isPublic: !playlist.isPublic}});
        toast.success(!playlist.isPublic ? 'Playlist is now public' : 'Playlist is now private');
    };

    const handleToggleCollaboration = () => {
        if (isSystem) return;
        updatePlaylist.mutate({id: playlist.id, payload: {isCollaborative: !playlist.isCollaborative}});
        toast.success(!playlist.isCollaborative ? 'Collaboration enabled' : 'Collaboration disabled');
    };

    const handleDelete = () => {
        if (window.confirm(`Delete "${playlist.name}" permanently?`)) {
            deletePlaylist.mutateAsync(playlist.id).then(() => navigate('/'));
        }
    };

    const handleAddToQueue = async () => {
        if (!playlist.id) return;
        const toastId = toast.loading('Loading tracks...');
        try {
            const tracksData = await playlistApi.getPlaylistTracks(playlist.id, 0, 500);
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
    const handleBulkAddToTargetPlaylist = async (targetPlaylistId: string, targetTitle: string) => {
        const toastId = toast.loading('Synchronizing tracks...');
        try {
            const tracksData = await playlistApi.getPlaylistTracks(playlist.id, 0, 500);
            const trackIds = tracksData.content.map(t => t.trackId);

            if (trackIds.length === 0) {
                toast.success('Source playlist is empty', {id: toastId});
                return;
            }
            for (const trackId of trackIds) {
                await playlistApi.addTrack(targetPlaylistId, trackId);
            }
            toast.success(`Injected tracks into ${targetTitle}`, {id: toastId});
        } catch {
            toast.error('Bulk operation failed', {id: toastId});
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    {children}
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-60 bg-slate-900 border-slate-800 text-slate-200">

                    <DropdownMenuItem onSelect={handleAddToQueue} className="focus:bg-slate-800 cursor-pointer">
                        <ListPlus className="mr-2 h-4 w-4 text-violet-400"/> Add to Queue
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-slate-800"/>

                    {isOwner && (
                        <>
                            {!isSystem && (
                                <DropdownMenuItem onSelect={() => setIsEditOpen(true)}
                                                  className="focus:bg-slate-800 cursor-pointer">
                                    <Edit3 className="mr-2 h-4 w-4"/> Edit details
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onSelect={(e) => {
                                e.preventDefault();
                                handleTogglePrivacy();
                            }} className="focus:bg-slate-800 cursor-pointer">
                                {playlist.isPublic ? <EyeOff className="mr-2 h-4 w-4"/> :
                                    <Eye className="mr-2 h-4 w-4"/>}
                                {playlist.isPublic ? 'Make Private' : 'Make Public'}
                            </DropdownMenuItem>
                            {!isSystem && (
                                <DropdownMenuItem onSelect={(e) => {
                                    e.preventDefault();
                                    handleToggleCollaboration();
                                }} className="focus:bg-slate-800 cursor-pointer flex items-center justify-between">
                                    <span className="flex items-center">
                                    {playlist.isCollaborative ?
                                        <User className="mr-2 h-4 w-4"/> :
                                        <Users className="mr-2 h-4 w-4"/>}
                                        {playlist.isCollaborative ? 'Disable Collab' : 'Enable Collab'}
                                    </span>

                                </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator className="bg-slate-800"/>
                        </>
                    )}

                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="focus:bg-slate-800 cursor-pointer">
                            <PlusCircle className="mr-2 h-4 w-4"/> Add to Playlist
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent
                            className="w-48 bg-slate-900 border-slate-800 max-h-[250px] overflow-y-auto custom-scrollbar">
                            {targetPlaylists.length === 0 ? (
                                <div className="px-2 py-2 text-xs text-center text-slate-500">No options</div>
                            ) : (
                                targetPlaylists.map(target => (
                                    <DropdownMenuItem key={target.id}
                                                      onSelect={() => handleBulkAddToTargetPlaylist(target.id, target.title)}
                                                      className="focus:bg-slate-800 cursor-pointer text-xs truncate">
                                        {target.title}
                                    </DropdownMenuItem>
                                ))
                            )}
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>

                        <DropdownMenuItem onSelect={() => duplicatePlaylist.mutate(playlist.id)}
                                          className="focus:bg-slate-800 cursor-pointer">
                            <CopyPlus className="mr-2 h-4 w-4"/> Clone Playlist
                        </DropdownMenuItem>

                    <DropdownMenuItem onSelect={handleCopyLink} className="focus:bg-slate-800 cursor-pointer">
                        <Link2 className="mr-2 h-4 w-4"/> Copy Link
                    </DropdownMenuItem>

                    {isOwner && !isSystem && (
                        <>
                            <DropdownMenuSeparator className="bg-slate-800"/>
                            <DropdownMenuItem onSelect={handleDelete}
                                              className="text-red-400 focus:bg-red-500/10 focus:text-red-300 cursor-pointer">
                                <Trash2 className="mr-2 h-4 w-4"/> Delete Playlist
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            {isEditOpen && (
                <EditPlaylistModal playlist={playlist} isOpen={isEditOpen} onClose={() => setIsEditOpen(false)}/>
            )}
            {isCollabOpen && currentUser && (
                <CollaboratorsModal playlist={playlist} currentUserId={currentUser.id} isOpen={isCollabOpen}
                                    onClose={() => setIsCollabOpen(false)}/>
            )}
        </>
    );
};