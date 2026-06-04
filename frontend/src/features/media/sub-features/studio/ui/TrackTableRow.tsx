import {TrackStatusBadge} from '../../moderation/ui/TrackStatusBadge.tsx';
import {useSecureUrl} from '@/shared/hooks/useSecureUrl.ts';
import {mediaApi} from '../../../api/media.api.ts';
import type {TrackDto} from '../../../types';
import {OwnedTrackDropdownMenu} from "@/features/media/sub-features/studio/ui/OwnedTrackDropdownMenu.tsx";

interface TrackTableRowProps {
    track: TrackDto;
}

export const TrackTableRow = ({track}: TrackTableRowProps) => {
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
                            <div className="flex h-full w-full items-center justify-center text-slate-600 text-xs">No
                                Cover</div>
                        )}
                    </div>
                    <div className="flex flex-col">
                        <span className="font-medium text-slate-200 truncate max-w-[200px]">{track.title}</span>
                        <span className="text-xs text-slate-500">{track.genre || 'Uncategorized'}</span>
                    </div>
                </div>
            </td>

            <td className="px-6 py-4">
                <TrackStatusBadge status={track.status}/>
            </td>

            <td className="px-6 py-4 hidden md:table-cell text-slate-400">
                {track.createdAt ? new Date(track.createdAt).toLocaleDateString() : '-'}
            </td>

            <td className="px-6 py-4 text-right">
                <OwnedTrackDropdownMenu track={track}/>
            </td>
        </tr>
    );
};