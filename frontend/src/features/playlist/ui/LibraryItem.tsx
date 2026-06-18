import type {KeyboardEvent} from 'react';
import {Lock, Users, Heart, User as UserIcon} from 'lucide-react';
import {cn} from '@/shared/lib/utils';
import {PlaylistContextMenu} from '@/features/playlist/ui/PlaylistContextMenu';
import {useSecureUrl} from '@/shared/hooks/useSecureUrl';
import {profileApi} from '@/features/profile/api/profile.api';
import {playlistApi} from "@/features/playlist/api/playlist.api";
import {useAuthStore} from '@/shared/store/authStore';
import {useTranslation} from '@/shared/lib/i18n/useTranslation';
import type {PlaylistDto} from "@/features/playlist/types";
import type {LibraryItemDto} from "@/features/library/types";

interface LibraryItemProps {
    item?: LibraryItemDto;
    playlist?: PlaylistDto;
    viewMode: 'collapsed' | 'normal' | 'expanded';
    isActive?: boolean;
    onClick: () => void;
}

export const LibraryItem = ({item, playlist, viewMode, isActive, onClick}: LibraryItemProps) => {
    const {user: currentUser} = useAuthStore();
    const {t} = useTranslation();

    const isPlaylist = !!playlist || !!item?.type.includes('PLAYLIST');
    const isSystemLiked = (playlist?.isSystem && playlist?.name === 'Liked Tracks') ||
        (item?.type === 'OWNED_PLAYLIST' && item?.title === 'Liked Tracks');

    const isProfile = item?.type === 'FOLLOWED_PROFILE';

    const title = item?.title || playlist?.name || t.library.item.unknownTitle;
    const prefix = isPlaylist ? `${t.library.item.playlistPrefix} • ` : '';
    const subtitle = `${prefix}${item?.subtitle || playlist?.ownerAlias || ''}`;
    const rawImageUrl = item?.imageUrl || playlist?.coverMinioPath;
    const targetId = item?.id || playlist?.id;

    // --- Strict RBAC Visualization Logic ---
    const isOwner = currentUser?.id === item?.ownerId || currentUser?.id === playlist?.ownerId;
    const isCollaborative = item?.isCollaborative || playlist?.isCollaborative;
    const isActiveCollaborator = item?.isCollaborator || playlist?.collaborators?.some(c => c.id === currentUser?.id);

    const showOwnership = isCollaborative && isOwner;
    const showParticipantIcon = isCollaborative && isActiveCollaborator && !isOwner;

    const username = isProfile && item?.subtitle ? item.subtitle.split('@')[1] : null;

    const {url: secureAvatarUrl, isLoading: isAvatarLoading} = useSecureUrl(
        `library-avatar-${username || 'idle'}`,
        () => username ? profileApi.getAvatarBlob(username) : Promise.reject('No username'),
        !!(isProfile && rawImageUrl && username)
    );

    const {url: securePlaylistCoverUrl, isLoading: isPlaylistCoverLoading} = useSecureUrl(
        `library-playlist-cover-${targetId || 'idle'}`,
        () => targetId ? playlistApi.getPlaylistCoverBlob(targetId) : Promise.reject('No targetId'),
        !!(!isProfile && !isSystemLiked && rawImageUrl && targetId)
    );

    const displayImageUrl = isProfile ? secureAvatarUrl : securePlaylistCoverUrl;
    const isLoading = isProfile ? isAvatarLoading : isPlaylistCoverLoading;

    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
        }
    };

    const renderCover = () => {
        if (isSystemLiked) {
            return <Heart aria-hidden="true"
                className={cn("text-white fill-white", viewMode === 'expanded' ? "w-12 h-12 shadow-sm" : "w-5 h-5")}/>;
        }

        if (isLoading) {
            return <div className="w-full h-full animate-pulse bg-slate-700"/>;
        }

        if (isProfile && !displayImageUrl) {
            return <UserIcon aria-hidden="true" className={cn("text-slate-400", viewMode === 'expanded' ? "w-12 h-12" : "w-6 h-6")}/>;
        }

        if (displayImageUrl) {
            return <img src={displayImageUrl} alt={title} className="w-full h-full object-cover"/>;
        }

        return (
            <span
                className={cn("font-bold text-slate-500 uppercase", viewMode === 'expanded' ? "text-4xl" : "text-lg")}>
                {title[0]}
            </span>
        );
    };

    const renderContent = () => {
        // Renders as a vertical card for the expanded grid
        if (viewMode === 'expanded') {
            return (
                <div onClick={onClick} onKeyDown={handleKeyDown} role="button" tabIndex={0} aria-label={title}
                     className={cn(
                    "group flex flex-col gap-3 p-3 rounded-xl cursor-pointer transition-all duration-300 w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                    isActive ? "bg-slate-800/80 shadow-inner" : "bg-slate-900/40 hover:bg-slate-800/60"
                )}>
                    <div className={cn(
                        "aspect-square w-full shrink-0 shadow-md flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-[1.02]",
                        isProfile ? "rounded-full" : "rounded-lg",
                        isSystemLiked ? "bg-gradient-to-br from-indigo-600 via-purple-700 to-violet-800" : "bg-slate-800"
                    )}>
                        {renderCover()}
                    </div>
                    <div className="flex flex-col min-w-0 px-1 text-center">
                        <h4 className={cn("text-sm font-semibold truncate flex items-center justify-center gap-1.5", isActive ? "text-indigo-400" : "text-slate-100")}>
                            {title}
                            {playlist?.isSystem && !isSystemLiked &&
                                <Lock className="w-3 h-3 opacity-60" role="img" aria-label={t.library.item.lockedSystem}/>}
                            {showOwnership &&
                                <Users className="w-3.5 h-3.5 text-indigo-400 shrink-0" role="img" aria-label={t.library.item.ownerBadge}/>}
                            {showParticipantIcon &&
                                <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0" role="img" aria-label={t.library.item.collaboratorBadge}/>}
                        </h4>
                        <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">{isSystemLiked ? t.library.item.systemPlaylist : subtitle}</p>
                    </div>
                </div>
            );
        }

        // Renders as a standard horizontal row for normal/collapsed
        return (
            <div onClick={onClick} onKeyDown={handleKeyDown} role="button" tabIndex={0} aria-label={title}
                 title={viewMode === 'collapsed' ? title : undefined}
                 className={cn(
                "group flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all duration-200 w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                isActive ? "bg-slate-800/80 shadow-inner" : "hover:bg-slate-800/40",
                viewMode === 'collapsed' ? "justify-center" : ""
            )}>
                <div className={cn(
                    "w-12 h-12 shrink-0 shadow-sm flex items-center justify-center overflow-hidden",
                    isProfile ? "rounded-full" : "rounded-md",
                    isSystemLiked ? "bg-gradient-to-br from-indigo-600 via-purple-700 to-violet-800" : "bg-slate-800"
                )}>
                    {renderCover()}
                </div>

                {viewMode !== 'collapsed' && (
                    <div className="flex-1 min-w-0">
                        <h4 className={cn("text-sm font-semibold truncate flex items-center gap-1.5", isActive ? "text-indigo-400" : "text-slate-100")}>
                            {title}
                            {playlist?.isSystem && !isSystemLiked &&
                                <Lock className="w-3 h-3 opacity-60" role="img" aria-label={t.library.item.lockedSystem}/>}
                            {showOwnership &&
                                <Users className="w-3.5 h-3.5 text-indigo-400 shrink-0" role="img" aria-label={t.library.item.ownerBadge}/>}
                            {showParticipantIcon &&
                                <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0" role="img" aria-label={t.library.item.collaboratorBadge}/>}
                        </h4>
                        <p className="text-xs text-slate-500 font-medium truncate">{isSystemLiked ? t.library.item.systemPlaylist : subtitle}</p>
                    </div>
                )}
            </div>
        );
    };

    const content = renderContent();

    // Profiles skip the playlist context menu
    if (isProfile) return content;

    // Polymorphic delegation
    if (playlist || item) {
        return <PlaylistContextMenu playlist={playlist} item={item}>{content}</PlaylistContextMenu>;
    }

    return content;
};