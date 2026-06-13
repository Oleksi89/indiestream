import {Clock, Disc3} from 'lucide-react';
import {TrackContextMenu} from '@/features/media/ui/TrackContextMenu';
import {TrackCard} from "@/features/media/ui/TrackCard";
import type {TrackDto} from "@/features/media/types";

interface PlaylistTrackListProps {
    playlistId: string;
    tracks: TrackDto[];
    rawTracksData: any;
    isLoading: boolean;
    onPlayTrack: (index: number) => void;
}

export const PlaylistTrackList = (
    {
        tracks,
        rawTracksData,
        isLoading,
        onPlayTrack
    }: PlaylistTrackListProps) => {
    return (
        <section className="px-8 mt-4 pb-20">
            <div
                className="grid grid-cols-[48px_minmax(120px,1fr)_120px_60px] md:grid-cols-[48px_minmax(120px,1fr)_150px_60px] gap-4 px-4 py-2 mb-2 text-xs font-semibold text-slate-400 border-b border-white/10 uppercase tracking-wider">
                <div>#</div>
                <div>Title</div>
                <div className="hidden md:block">Added At</div>
                <div className="text-right pr-2"><Clock size={16} className="inline-block"/></div>
            </div>

            <div className="flex flex-col">
                {isLoading ? (
                    <div className="py-10 text-center text-slate-500 flex justify-center items-center gap-2">
                        <Disc3 className="animate-spin h-5 w-5"/> Syncing library...
                    </div>
                ) : (
                    tracks.map((track, index) => (
                        <TrackContextMenu key={track.id} track={track}>
                            <TrackCard
                                track={track}
                                variant="playlist-row"
                                index={index + 1}
                                addedAt={rawTracksData?.content[index]?.addedAt}
                                onPlayOverride={() => onPlayTrack(index)}
                            />
                        </TrackContextMenu>
                    ))
                )}
            </div>
        </section>
    );
};