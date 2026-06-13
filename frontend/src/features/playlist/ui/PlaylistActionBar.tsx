import {Play, Check, Users, BarChart2, MoreHorizontal} from 'lucide-react';
import {Button} from '@/shared/ui/button';
import {cn} from '@/shared/lib/utils';
import {PlaylistDropdownMenu} from "@/features/playlist/ui/PlaylistDropdownMenu";
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
    return (
        <section className="px-8 py-6 flex items-center gap-6 backdrop-blur-3xl border-b border-white/5">
            <Button onClick={onPlayPlaylist} size="icon"
                    className="w-14 h-14 rounded-full bg-violet-600 hover:bg-violet-500 shadow-xl hover:scale-105 transition-transform">
                <Play size={24} fill="currentColor" className="ml-1"/>
            </Button>

            {!isOwner && !playlist.isSystem && (
                <Button
                    onClick={onToggleFollow}
                    variant={isFollowed ? "outline" : "default"}
                    className={cn("rounded-full px-6 font-bold tracking-wide transition-all border-2",
                        isFollowed ? "border-white/30 text-white hover:border-white/60 bg-transparent" : "bg-white text-black hover:bg-slate-200 border-transparent")}
                >
                    {isFollowed ? <><Check className="w-5 h-5 mr-2"/> Saved</> : 'Save'}
                </Button>
            )}

            {playlist.isCollaborative && (isOwner || isCollaborator) && (
                <Button variant="ghost" className="rounded-full text-slate-300 hover:text-white hover:bg-white/10"
                        onClick={onOpenCollab}>
                    <Users className="w-5 h-5 mr-2"/> Participants
                </Button>
            )}

            {isOwner && !playlist.isSystem && (
                <Button variant="ghost"
                        className="rounded-full text-violet-300 hover:text-white hover:bg-violet-500/20 bg-violet-500/10 border border-violet-500/30"
                        onClick={onOpenAnalytics}>
                    <BarChart2 className="w-5 h-5 mr-2"/> Stats
                </Button>
            )}

            <PlaylistDropdownMenu playlist={playlist}>
                <button className="text-white/60 hover:text-white transition-colors focus:outline-none">
                    <MoreHorizontal size={32}/>
                </button>
            </PlaylistDropdownMenu>
        </section>
    );
};