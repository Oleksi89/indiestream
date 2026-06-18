import {Play, Pause, Check, Users, BarChart2, MoreHorizontal} from 'lucide-react'; // 1. Додано Pause
import {Button} from '@/shared/ui/button';
import {cn} from '@/shared/lib/utils';
import {PlaylistDropdownMenu} from "@/features/playlist/ui/PlaylistDropdownMenu";
import {useTranslation} from '@/shared/lib/i18n/useTranslation';
import {usePlayerStore} from '@/shared/store/playerStore'; // 2. Додано імпорт стору
import type {PlaylistDto} from '../types';

interface PlaylistActionBarProps {
    playlist: PlaylistDto;
    isOwner: boolean;
    isCollaborator: boolean;
    isFollowed: boolean;
    onPlayPlaylist: () => void;
    onToggleFollow: () => void;
    onOpenCollab: () => void;
    onOpenAnalytics: () => void;
}

export const PlaylistActionBar = (
    {
        playlist,
        isOwner,
        isCollaborator,
        isFollowed,
        onPlayPlaylist,
        onToggleFollow,
        onOpenCollab,
        onOpenAnalytics
    }: PlaylistActionBarProps) => {
    const {t} = useTranslation();

    const {currentTrack, isPlaying, playbackContext, togglePlay} = usePlayerStore();

    const isCurrentContextActive = playbackContext?.type === 'PLAYLIST' && playbackContext?.id === playlist.id;
    const isCurrentContextPlaying = isCurrentContextActive && isPlaying && !!currentTrack;

    const handlePlayClick = () => {
        if (isCurrentContextActive) {
            togglePlay();
        } else {
            onPlayPlaylist();
        }
    };

    return (
        <section className="px-8 py-6 flex items-center gap-6 backdrop-blur-3xl border-b border-white/5">
            <Button onClick={handlePlayClick} size="icon"
                    aria-label={isCurrentContextPlaying ? t.playlist.actions.pause : t.playlist.actions.play}
                    title={isCurrentContextPlaying ? t.playlist.actions.pause : t.playlist.actions.play}
                    className="w-14 h-14 rounded-full bg-violet-600 hover:bg-violet-500 shadow-xl hover:scale-105 transition-transform">
                {isCurrentContextPlaying ? (
                    <Pause size={24} fill="currentColor" aria-hidden="true"/>
                ) : (
                    <Play size={24} fill="currentColor" className="ml-1" aria-hidden="true"/>
                )}
            </Button>

            {!isOwner && !playlist.isSystem && (
                <Button
                    onClick={onToggleFollow}
                    variant={isFollowed ? "outline" : "default"}
                    aria-pressed={isFollowed}
                    aria-label={isFollowed ? t.playlist.actions.unsaveAria : t.playlist.actions.saveAria}
                    title={isFollowed ? t.playlist.actions.unsaveAria : t.playlist.actions.saveAria}
                    className={cn("rounded-full px-6 font-bold tracking-wide transition-all border-2",
                        isFollowed ? "border-white/30 text-white hover:border-white/60 bg-transparent" : "bg-white text-black hover:bg-slate-200 border-transparent")}
                >
                    {isFollowed ? <><Check className="w-5 h-5 mr-2"
                                           aria-hidden="true"/> {t.playlist.actions.saved}</> : t.playlist.actions.save}
                </Button>
            )}

            {playlist.isCollaborative && (isOwner || isCollaborator) && (
                <Button variant="ghost" className="rounded-full text-slate-300 hover:text-white hover:bg-white/10"
                        aria-label={t.playlist.actions.openParticipants} title={t.playlist.actions.openParticipants}
                        onClick={onOpenCollab}>
                    <Users className="w-5 h-5 mr-2" aria-hidden="true"/> {t.playlist.actions.participants}
                </Button>
            )}

            {isOwner && !playlist.isSystem && (
                <Button variant="ghost"
                        className="rounded-full text-violet-300 hover:text-white hover:bg-violet-500/20 bg-violet-500/10 border border-violet-500/30"
                        aria-label={t.playlist.actions.openStats} title={t.playlist.actions.openStats}
                        onClick={onOpenAnalytics}>
                    <BarChart2 className="w-5 h-5 mr-2" aria-hidden="true"/> {t.playlist.actions.stats}
                </Button>
            )}

            <PlaylistDropdownMenu playlist={playlist}>
                <button className="text-white/60 hover:text-white transition-colors focus:outline-none"
                        aria-label={t.playlist.actions.moreOptions} title={t.playlist.actions.moreOptions}>
                    <MoreHorizontal size={32} aria-hidden="true"/>
                </button>
            </PlaylistDropdownMenu>
        </section>
    );
};