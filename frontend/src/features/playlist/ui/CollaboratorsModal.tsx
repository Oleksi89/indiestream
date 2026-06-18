import {useState} from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {useQuery} from '@tanstack/react-query';
import {Search, X, UserPlus, Trash2, LogOut, Loader2, ShieldCheck} from 'lucide-react';
import {authApi} from '@/features/auth/api/auth.api';
import {useAddCollaboratorMutation, useRemoveCollaboratorMutation} from '../hooks/usePlaylists';
import {usePlaylistPermissions} from '../hooks/usePlaylistPermissions';
import {useDebounce} from '@/shared/hooks/useDebounce';
import {UserAvatar} from '@/shared/components/UserAvatar';
import {Button} from '@/shared/ui/button';
import {useTranslation} from '@/shared/lib/i18n/useTranslation';
import type {PlaylistDto} from '../types';
import type {UserPublicProfileDto} from '@/features/auth/types';

interface CollaboratorsModalProps {
    playlist: PlaylistDto;
    currentUserId: string;
    isOpen: boolean;
    onClose: () => void;
}

export const CollaboratorsModal = ({playlist, currentUserId, isOpen, onClose}: CollaboratorsModalProps) => {
    const {t} = useTranslation();
    const {isOwner, canManageCollaborators} = usePlaylistPermissions(playlist, currentUserId);
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedQuery = useDebounce(searchQuery, 300);

    const addMutation = useAddCollaboratorMutation();
    const removeMutation = useRemoveCollaboratorMutation();

    const {data: searchResults, isFetching} = useQuery({
        queryKey: ['users', 'autocomplete', debouncedQuery],
        queryFn: () => authApi.searchUsersAutocomplete(debouncedQuery),
        enabled: debouncedQuery.length >= 2 && canManageCollaborators,
        staleTime: 1000 * 60
    });

    const existingUsernames = new Set([
        playlist.ownerUsername,
        ...(playlist.collaborators?.map(c => c.username) || [])
    ]);

    const filteredResults = searchResults?.filter(user => !existingUsernames.has(user.username)) || [];

    const handleAdd = async (user: UserPublicProfileDto) => {
        await addMutation.mutateAsync({playlistId: playlist.id, targetProfile: user});
        setSearchQuery(''); // Reset search on successful addition
    };

    const handleRemove = async (collaboratorId: string) => {
        await removeMutation.mutateAsync({playlistId: playlist.id, collaboratorId});
        if (collaboratorId === currentUserId) {
            onClose(); // Close modal if user left the playlist themselves
        }
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => {
            if (!open) {
                setSearchQuery('');
                onClose();
            }
        }}>
            <Dialog.Portal>
                <Dialog.Overlay
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"/>
                <Dialog.Content
                    className="fixed left-[50%] top-[50%] z-50 flex flex-col w-full max-w-md translate-x-[-50%] translate-y-[-50%] bg-slate-900 shadow-2xl sm:rounded-2xl border border-slate-800 overflow-hidden max-h-[85vh]">

                    <div className="flex items-center justify-between p-6 border-b border-slate-800">
                        <Dialog.Title className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                            {t.playlist.collaborators.title}
                        </Dialog.Title>
                        <Dialog.Close aria-label={t.common.close} title={t.common.close}
                                      className="text-slate-400 hover:text-white transition-colors">
                            <X size={20} aria-hidden="true"/>
                        </Dialog.Close>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                        {/* 1. Search Engine (Owner Only) */}
                        {canManageCollaborators && (
                            <div className="space-y-3">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                            size={18} aria-hidden="true"/>
                                    <input
                                        type="text"
                                        aria-label={t.playlist.collaborators.searchLabel}
                                        placeholder={t.playlist.collaborators.searchPlaceholder}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                                    />
                                    {isFetching && <Loader2
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-500 animate-spin"
                                        size={16} aria-hidden="true"/>}
                                </div>

                                {/* Autocomplete Results */}
                                {searchQuery.length >= 2 && (
                                    <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                                        {filteredResults.length === 0 && !isFetching ? (
                                            <div className="p-4 text-center text-sm text-slate-500">{t.playlist.collaborators.noUsersFound}</div>
                                        ) : (
                                            filteredResults.map(user => (
                                                <div key={user.id}
                                                     className="flex items-center justify-between p-3 border-b border-slate-800/50 last:border-0 hover:bg-slate-800/50 transition-colors">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <UserAvatar username={user.username}
                                                                    avatarPath={user.avatarPath} className="w-10 h-10"/>
                                                        <div className="flex flex-col min-w-0">
                                                            <span
                                                                className="text-sm font-bold text-white truncate">{user.alias}</span>
                                                            <span
                                                                className="text-xs text-slate-400 truncate">@{user.username}</span>
                                                        </div>
                                                    </div>
                                                    <Button size="icon" variant="ghost"
                                                            aria-label={t.playlist.collaborators.addCollaborator}
                                                            title={t.playlist.collaborators.addCollaborator}
                                                            className="text-violet-400 hover:text-violet-300 hover:bg-violet-500/10"
                                                            onClick={() => handleAdd(user)}>
                                                        <UserPlus size={18} aria-hidden="true"/>
                                                    </Button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 2. Active Participants List */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">{t.playlist.collaborators.participants}</h3>
                            <div className="space-y-2">
                                {/* Owner */}
                                <div
                                    className="flex items-center justify-between p-3 rounded-xl bg-slate-800/20 ">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <UserAvatar
                                                username={playlist.ownerUsername}
                                                avatarPath={playlist.ownerAvatarPath}
                                                className="w-10 h-10 border border-white/5"
                                            />
                                            <ShieldCheck
                                                className="absolute -bottom-1 -right-1 text-emerald-400 bg-slate-900 rounded-full"
                                                size={16} role="img" aria-label={t.playlist.collaborators.owner}/>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-white flex items-center gap-2">
                                                {playlist.ownerAlias}
                                                <span
                                                    className="text-[10px] bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full border border-violet-500/30">{t.playlist.collaborators.owner}</span>
                                            </span>
                                            <span className="text-xs text-slate-400">@{playlist.ownerUsername}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Collaborators */}
                                {playlist.collaborators?.map(collab => {
                                    const isSelf = collab.id === currentUserId;
                                    const canRemove = isOwner || isSelf;

                                    return (
                                        <div key={collab.id}
                                             className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-800/30 transition-colors group">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <UserAvatar username={collab.username} avatarPath={collab.avatarPath}
                                                            className="w-10 h-10"/>
                                                <div className="flex flex-col min-w-0">
                                                    <span
                                                        className="text-sm font-bold text-white truncate">{collab.alias} {isSelf && t.playlist.collaborators.you}</span>
                                                    <span
                                                        className="text-xs text-slate-400 truncate">@{collab.username}</span>
                                                </div>
                                            </div>

                                            {canRemove && (
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    aria-label={isSelf ? t.playlist.collaborators.leave : t.playlist.collaborators.remove}
                                                    title={isSelf ? t.playlist.collaborators.leave : t.playlist.collaborators.remove}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-400 hover:bg-red-400/10"
                                                    onClick={() => handleRemove(collab.id)}
                                                    disabled={removeMutation.isPending}
                                                >
                                                    {isSelf ? <LogOut size={18} aria-hidden="true"/> : <Trash2 size={18} aria-hidden="true"/>}
                                                </Button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};