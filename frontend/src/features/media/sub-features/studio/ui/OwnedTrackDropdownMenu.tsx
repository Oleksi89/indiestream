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

export type TrackModalType = 'EDIT' | 'PUBLISH' | 'ARCHIVE' | 'RESOLUTION' | 'APPEAL';

interface OwnedTrackDropdownMenuProps {
    track: TrackDto;
    onOpenModal: (type: TrackModalType, track: TrackDto) => void;
}

export const OwnedTrackDropdownMenu = ({track, onOpenModal}: OwnedTrackDropdownMenuProps) => {
    const permissions = useTrackPermissions(track.status);
    const {mutate: toggleVisibility, isPending: isToggling} = useToggleTrackVisibility();

    const handleToggleVisibility = (e: Event) => {
        e.preventDefault();
        toggleVisibility({trackId: track.id, currentStatus: track.status});
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                className="p-2 text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 rounded-md transition-colors outline-none">
                <MoreHorizontal size={18}/>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-slate-800 text-slate-300">
                <DropdownMenuLabel>Manage Track</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-800"/>

                {/* --- HITL Moderation Actions --- */}
                {track.status === 'NEEDS_REVISION' && (
                    <DropdownMenuItem onSelect={() => onOpenModal('RESOLUTION', track)}
                                      className="cursor-pointer text-indigo-400 focus:text-indigo-300 focus:bg-indigo-500/10">
                        <Sparkles className="mr-2" size={14}/> Resolve AI Feedback
                    </DropdownMenuItem>
                )}

                {['BANNED', 'REJECTED'].includes(track.status) && (
                    <DropdownMenuItem
                        disabled={track.hasAppealed}
                        onSelect={() => onOpenModal('APPEAL', track)}
                        className="cursor-pointer text-red-400 focus:text-red-300 focus:bg-red-500/10"
                    >
                        <Gavel className="mr-2" size={14}/>
                        {track.hasAppealed ? 'Appeal Pending' : 'Submit Appeal'}
                    </DropdownMenuItem>
                )}

                {/* --- Standard Workflow Actions --- */}
                {permissions.canPublish && (
                    <DropdownMenuItem onSelect={() => onOpenModal('PUBLISH', track)}
                                      className="cursor-pointer text-emerald-400 focus:text-emerald-300 focus:bg-emerald-500/10">
                        <Globe className="mr-2" size={14}/> Publish Track
                    </DropdownMenuItem>
                )}

                {permissions.canEditMetadata && (
                    <DropdownMenuItem onSelect={() => onOpenModal('EDIT', track)}
                                      className="cursor-pointer focus:bg-slate-800 focus:text-white">
                        <Edit className="mr-2" size={14}/> Edit Metadata
                    </DropdownMenuItem>
                )}

                {permissions.canHide && (
                    <DropdownMenuItem disabled={isToggling} onSelect={handleToggleVisibility}
                                      className="cursor-pointer focus:bg-slate-800 focus:text-white">
                        {isToggling ? <Loader2 className="mr-2 animate-spin" size={14}/> :
                            <EyeOff className="mr-2" size={14}/>}
                        Hide from Public
                    </DropdownMenuItem>
                )}

                {permissions.canUnhide && (
                    <DropdownMenuItem disabled={isToggling} onSelect={handleToggleVisibility}
                                      className="cursor-pointer focus:bg-slate-800 focus:text-white">
                        {isToggling ? <Loader2 className="mr-2 animate-spin" size={14}/> :
                            <Eye className="mr-2" size={14}/>}
                        Make Public
                    </DropdownMenuItem>
                )}

                {/* --- Terminal Actions --- */}
                {permissions.canArchive && (
                    <>
                        <DropdownMenuSeparator className="bg-slate-800"/>
                        <DropdownMenuItem onSelect={() => onOpenModal('ARCHIVE', track)}
                                          className="cursor-pointer text-red-400 focus:text-red-300 focus:bg-red-500/10">
                            <Archive className="mr-2" size={14}/> Archive Track
                        </DropdownMenuItem>
                    </>
                )}

                {permissions.isProcessing && (
                    <DropdownMenuItem disabled className="opacity-50">
                        <Loader2 className="mr-2 animate-spin" size={14}/> Processing...
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};