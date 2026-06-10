import {TrackStatusBadge} from "@/features/media/sub-features/moderation/ui/TrackStatusBadge.tsx";
import type {TrackModalType} from "@/features/media/sub-features/studio/ui/OwnedTrackDropdownMenu.tsx";
import {OwnedTrackDropdownMenu} from "@/features/media/sub-features/studio/ui/OwnedTrackDropdownMenu.tsx";
import {TrackCard} from "@/features/media/ui/TrackCard";
import {usePlayerStore} from "@/shared/store/playerStore";
import type {TrackDto} from "@/features/media/types";

interface TrackTableRowProps {
    track: TrackDto;
    onOpenModal: (type: TrackModalType, track: TrackDto) => void;
}

export const TrackTableRow = ({track, onOpenModal}: TrackTableRowProps) => {
    const {playContext} = usePlayerStore();

    return (
        <tr className="hover:bg-slate-800/30 transition-colors group">
            <td className="px-6 py-2 w-full max-w-[300px]">
                {/* Using standard TrackCard for unified UI, but overriding play logic */}
                <TrackCard
                    track={track}
                    variant="compact"
                    className="bg-transparent hover:bg-transparent border-none p-0 max-w-full"
                    onPlayOverride={() => {
                        playContext([track], {type: 'SYSTEM_INTERNAL'}, 0);
                    }}
                />
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