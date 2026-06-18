import type {KeyboardEvent} from 'react';
import {Link} from 'react-router-dom';
import {Pencil} from 'lucide-react';
import {UserAvatar} from '@/shared/components/UserAvatar';
import {useTranslation} from '@/shared/lib/i18n/useTranslation';
import type {PlaylistDto} from "@/features/playlist/types";


interface PlaylistHeaderProps {
    playlist: PlaylistDto;
    coverUrl: string | null | undefined;
    canEditMetadata: boolean;
    onEditClick: () => void;
    onCollabClick: () => void;
}

export const PlaylistHeader = ({
                                   playlist,
                                   coverUrl,
                                   canEditMetadata,
                                   onEditClick,
                                   onCollabClick
                               }: PlaylistHeaderProps) => {
    const {t} = useTranslation();
    const isEditable = canEditMetadata && !playlist.isSystem;

    return (
        <header className="relative flex flex-col md:flex-row items-center md:items-end gap-6 p-8 pb-6 mt-16 lg:mt-24">
            <div
                className="group relative w-52 h-52 shrink-0 shadow-2xl rounded-xl overflow-hidden bg-slate-800/50 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                onClick={() => isEditable && onEditClick()}
                {...(isEditable ? {
                    role: 'button',
                    tabIndex: 0,
                    'aria-label': t.playlist.header.editCoverAria,
                    title: t.playlist.header.editCoverAria,
                    onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onEditClick();
                        }
                    }
                } : {})}
            >
                {coverUrl ? (
                    <img src={coverUrl}
                         className="w-full h-full object-cover transition-transform group-hover:scale-105" alt={t.playlist.header.cover}/>
                ) : (
                    <div className="w-full h-full bg-black/20 flex items-center justify-center">
                        <span className="text-6xl font-bold opacity-50">{playlist.name[0]}</span>
                    </div>
                )}

                {isEditable && (
                    <div
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 text-white">
                        <Pencil size={32} aria-hidden="true"/>
                        <span className="text-sm font-semibold tracking-wide">{t.playlist.header.editCover}</span>
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-2 z-10 text-white w-full text-center md:text-left">
                <span
                    className="text-xs font-bold uppercase tracking-widest text-white/80 flex items-center justify-center md:justify-start gap-2">
                    {playlist.isPublic ? t.playlist.header.publicPlaylist : t.playlist.header.privatePlaylist}
                    {playlist.isSystem ? ` ${t.playlist.header.system}` : ''}
                    {playlist.isCollaborative &&
                        <span className="bg-white/20 px-2 py-0.5 rounded-full">{t.playlist.header.collaborative}</span>}
                </span>

                <h1
                    className="text-5xl lg:text-7xl font-black tracking-tighter mb-4 cursor-pointer hover:underline line-clamp-2"
                    onClick={() => isEditable && onEditClick()}
                >
                    {playlist.name}
                </h1>

                {playlist.description &&
                    <p className="text-sm font-medium text-white/70 max-w-2xl mx-auto md:mx-0">{playlist.description}</p>}

                <div
                    className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-sm font-medium text-white/90 mt-2">
                    {playlist.isCollaborative && (
                        <button type="button"
                            className="flex items-center -space-x-2 mr-1 cursor-pointer hover:scale-105 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-full"
                            aria-label={t.playlist.header.openCollaborators} title={t.playlist.header.openCollaborators}
                            onClick={onCollabClick}>
                            <UserAvatar username={playlist.ownerUsername} avatarPath={playlist.ownerAvatarPath}
                                        className="w-8 h-8 border-2 border-slate-900 shadow-sm relative z-30"/>
                            {playlist.collaborators?.slice(0, 3).map((collab, index) => (
                                <div key={collab.id} style={{zIndex: 20 - index}} className="relative">
                                    <UserAvatar username={collab.username} avatarPath={collab.avatarPath}
                                                className="w-8 h-8 border-2 border-slate-900 shadow-sm"/>
                                </div>
                            ))}
                        </button>
                    )}
                    <Link to={`/user/${playlist.ownerUsername}`}
                          className="hover:underline cursor-pointer font-bold">{playlist.ownerAlias}</Link>
                    <span aria-hidden="true">•</span>
                    {playlist.followersCount > 0 && <><span>{t.playlist.header.saves.replace('{count}', String(playlist.followersCount))}</span><span aria-hidden="true">•</span></>}
                    <span>{t.playlist.header.tracks.replace('{count}', String(playlist.trackCount))}</span>
                    <span aria-hidden="true">•</span>
                    <span className="text-white/60">{t.playlist.header.minutes.replace('{count}', String(Math.floor(playlist.totalDurationSeconds / 60)))}</span>
                </div>
            </div>
        </header>
    );
};