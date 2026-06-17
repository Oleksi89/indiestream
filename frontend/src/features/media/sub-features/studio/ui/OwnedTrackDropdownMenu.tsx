import {MoreHorizontal, Edit, Gavel, Sparkles, Loader2, Globe, EyeOff, Eye, Archive} from 'lucide-react';

import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from '@/shared/ui/DropdownMenu.tsx';
import {useTrackPermissions} from "@/features/media/sub-features/studio/hooks/useTrackPermissions.ts";
import {useToggleTrackVisibility} from "@/features/media/hooks/useTrackMutations.ts";
import type {TrackDto} from "@/features/media/types";
import {useTranslation} from '@/shared/lib/i18n/useTranslation';

export type TrackModalType = 'EDIT' | 'PUBLISH' | 'ARCHIVE' | 'RESOLUTION' | 'APPEAL';

interface OwnedTrackDropdownMenuProps {
    track: TrackDto;
    onOpenModal: (type: TrackModalType, track: TrackDto) => void;
}

export const OwnedTrackDropdownMenu = ({track, onOpenModal}: OwnedTrackDropdownMenuProps) => {
    const permissions = useTrackPermissions(track.status);
    const {mutate: toggleVisibility, isPending: isToggling} = useToggleTrackVisibility();
    const {t} = useTranslation();
    const dd = t.media.studio.dropdown;

    const handleToggleVisibility = (e: Event) => {
        e.preventDefault();
        toggleVisibility({trackId: track.id, currentStatus: track.status});
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                aria-label={dd.openMenu.replace('{title}', track.title)}
                title={dd.openMenu.replace('{title}', track.title)}
                className="p-2 text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 rounded-md transition-colors outline-none">
                <MoreHorizontal size={18} aria-hidden="true"/>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-slate-800 text-slate-300">
                <DropdownMenuLabel>{dd.manageTrack}</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-800"/>

                {/* --- HITL Moderation Actions --- */}
                {track.status === 'NEEDS_REVISION' && (
                    <DropdownMenuItem onSelect={() => onOpenModal('RESOLUTION', track)}
                                      className="cursor-pointer text-indigo-400 focus:text-indigo-300 focus:bg-indigo-500/10">
                        <Sparkles className="mr-2" size={14} aria-hidden="true"/> {dd.resolveAiFeedback}
                    </DropdownMenuItem>
                )}

                {['BANNED', 'REJECTED'].includes(track.status) && (
                    <DropdownMenuItem
                        disabled={track.hasAppealed}
                        onSelect={() => onOpenModal('APPEAL', track)}
                        className="cursor-pointer text-red-400 focus:text-red-300 focus:bg-red-500/10"
                    >
                        <Gavel className="mr-2" size={14} aria-hidden="true"/>
                        {track.hasAppealed ? dd.appealPending : dd.submitAppeal}
                    </DropdownMenuItem>
                )}

                {/* --- Standard Workflow Actions --- */}
                {permissions.canPublish && (
                    <DropdownMenuItem onSelect={() => onOpenModal('PUBLISH', track)}
                                      className="cursor-pointer text-emerald-400 focus:text-emerald-300 focus:bg-emerald-500/10">
                        <Globe className="mr-2" size={14} aria-hidden="true"/> {dd.publishTrack}
                    </DropdownMenuItem>
                )}

                {permissions.canEditMetadata && (
                    <DropdownMenuItem onSelect={() => onOpenModal('EDIT', track)}
                                      className="cursor-pointer focus:bg-slate-800 focus:text-white">
                        <Edit className="mr-2" size={14} aria-hidden="true"/> {dd.editMetadata}
                    </DropdownMenuItem>
                )}

                {permissions.canHide && (
                    <DropdownMenuItem disabled={isToggling} onSelect={handleToggleVisibility}
                                      className="cursor-pointer focus:bg-slate-800 focus:text-white">
                        {isToggling
                            ? <Loader2 className="mr-2 animate-spin" size={14} aria-hidden="true"/>
                            : <EyeOff className="mr-2" size={14} aria-hidden="true"/>}
                        {dd.hideFromPublic}
                    </DropdownMenuItem>
                )}

                {permissions.canUnhide && (
                    <DropdownMenuItem disabled={isToggling} onSelect={handleToggleVisibility}
                                      className="cursor-pointer focus:bg-slate-800 focus:text-white">
                        {isToggling
                            ? <Loader2 className="mr-2 animate-spin" size={14} aria-hidden="true"/>
                            : <Eye className="mr-2" size={14} aria-hidden="true"/>}
                        {dd.makePublic}
                    </DropdownMenuItem>
                )}

                {/* --- Terminal Actions --- */}
                {permissions.canArchive && (
                    <>
                        <DropdownMenuSeparator className="bg-slate-800"/>
                        <DropdownMenuItem onSelect={() => onOpenModal('ARCHIVE', track)}
                                          className="cursor-pointer text-red-400 focus:text-red-300 focus:bg-red-500/10">
                            <Archive className="mr-2" size={14} aria-hidden="true"/> {dd.archiveTrack}
                        </DropdownMenuItem>
                    </>
                )}

                {permissions.isProcessing && (
                    <DropdownMenuItem disabled className="opacity-50">
                        <Loader2 className="mr-2 animate-spin" size={14} aria-hidden="true"/> {dd.processing}
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
