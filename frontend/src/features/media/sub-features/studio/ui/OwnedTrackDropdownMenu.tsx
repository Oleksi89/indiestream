import {useState} from 'react';
import {MoreHorizontal, Edit, Gavel, Sparkles, Loader2} from 'lucide-react';
import type {TrackDto} from '../../../types';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from '@/shared/ui/DropdownMenu.tsx';
import {AppealBanModal} from '../../moderation/ui/AppealBanModal.tsx';
import {TrackResolutionModal} from '../../moderation/ui/TrackResolutionModal.tsx';

interface TrackDropdownMenuProps {
    track: TrackDto;
}

export const OwnedTrackDropdownMenu = ({track}: TrackDropdownMenuProps) => {
    const [isAppealOpen, setIsAppealOpen] = useState(false);
    const [isResolutionOpen, setIsResolutionOpen] = useState(false);

    const isProcessing = track.status === 'PROCESSING' || track.status === 'AI_ANALYSIS';
    const isBannedOrRejected = track.status === 'BANNED' || track.status === 'REJECTED';
    const isNeedsRevision = track.status === 'NEEDS_REVISION';

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger
                    className="p-2 text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 rounded-md transition-colors outline-none">
                    <MoreHorizontal size={18}/>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-slate-900 border-slate-800 text-slate-300">
                    <DropdownMenuLabel>Manage Track</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-slate-800"/>

                    {isNeedsRevision && (
                        <DropdownMenuItem onSelect={() => setIsResolutionOpen(true)}
                                          className="cursor-pointer text-indigo-400 focus:text-indigo-300 focus:bg-indigo-500/10">
                            <Sparkles className="mr-2" size={14}/> Resolve AI Feedback
                        </DropdownMenuItem>
                    )}

                    {isBannedOrRejected && (
                        <DropdownMenuItem
                            disabled={track.hasAppealed}
                            onSelect={() => setIsAppealOpen(true)}
                            className="cursor-pointer text-red-400 focus:text-red-300 focus:bg-red-500/10"
                        >
                            <Gavel className="mr-2" size={14}/>
                            {track.hasAppealed ? 'Appeal Pending' : 'Submit Appeal'}
                        </DropdownMenuItem>
                    )}

                    {(!isProcessing && !isBannedOrRejected && !isNeedsRevision) && (
                        <DropdownMenuItem className="cursor-pointer focus:bg-slate-800 focus:text-white">
                            <Edit className="mr-2" size={14}/> Edit Metadata
                        </DropdownMenuItem>
                    )}

                    {isProcessing && (
                        <DropdownMenuItem disabled className="opacity-50">
                            <Loader2 className="mr-2 animate-spin" size={14}/> Processing...
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Injected Modals governed by local state */}
            {isAppealOpen &&
                <AppealBanModal track={track} isOpen={isAppealOpen} onClose={() => setIsAppealOpen(false)}/>}
            {isResolutionOpen && <TrackResolutionModal track={track} isOpen={isResolutionOpen}
                                                       onClose={() => setIsResolutionOpen(false)}/>}
        </>
    );
};