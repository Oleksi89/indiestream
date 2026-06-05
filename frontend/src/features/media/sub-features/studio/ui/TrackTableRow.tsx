import type {TrackDto} from '../../../types';

import {useSecureUrl} from "@/shared/hooks/useSecureUrl.ts";
import {mediaApi} from "@/features/media/api/media.api.ts";
import {TrackStatusBadge} from "@/features/media/sub-features/moderation/ui/TrackStatusBadge.tsx";
import type {TrackModalType} from "@/features/media/sub-features/studio/ui/OwnedTrackDropdownMenu.tsx";
import {OwnedTrackDropdownMenu} from "@/features/media/sub-features/studio/ui/OwnedTrackDropdownMenu.tsx";


interface TrackTableRowProps {
    track: TrackDto;
    onOpenModal: (type: TrackModalType, track: TrackDto) => void;
}

export const TrackTableRow = ({track, onOpenModal}: TrackTableRowProps) => {
    const {url: coverUrl} = useSecureUrl(
        `cover-${track.id}`,
        () => mediaApi.getTrackCoverBlob(track.id),
        !!track.coverMinioPath
    );

    return (
        <tr className="hover:bg-slate-800/30 transition-colors group">
            <td className="px-6 py-4">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-slate-800 border border-slate-700">
                        {coverUrl ? (
                            <img src={coverUrl} alt={track.title} className="h-full w-full object-cover"/>
                        ) : (
                            <div
                                className="flex h-full w-full items-center justify-center text-slate-600 text-xs font-medium">N/A</div>
                        )}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="font-medium text-slate-200 truncate max-w-[200px]">{track.title}</span>
                        <span className="text-xs text-slate-500">{track.genre || 'Uncategorized'}</span>
                    </div>
                </div>
            </td>

            <td className="px-6 py-4">
                <TrackStatusBadge status={track.status}/>
            </td>

            <td className="px-6 py-4 hidden md:table-cell text-slate-400">
                {track.createdAt ? new Date(track.createdAt).toLocaleDateString() : 'N/A'}
            </td>

            <td className="px-6 py-4 text-right">
                <OwnedTrackDropdownMenu track={track} onOpenModal={onOpenModal}/>
            </td>
        </tr>
    );
};