import {usePlayerStore} from '@/shared/store/playerStore';
import {TrackCard} from './TrackCard';
import {X, ListMusic, History} from 'lucide-react';
import {TrackContextMenu} from './TrackContextMenu';

export const QueueSlideover = () => {
    const {isQueueOpen, toggleQueue, currentTrack, queue, history} = usePlayerStore();

    if (!isQueueOpen) return null;

    return (
        <div
            className="fixed inset-y-0 right-0 w-96 bg-slate-900 border-l border-slate-800 shadow-2xl z-[40] flex flex-col pt-4 pb-24 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-6 pb-4 border-b border-slate-800">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <ListMusic size={20} className="text-violet-400"/>
                    Play Queue
                </h2>
                <button
                    onClick={toggleQueue}
                    className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                    <X size={20}/>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-8 custom-scrollbar">

                {/* Now Playing */}
                {currentTrack && (
                    <section>
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">Now
                            Playing</h3>
                        <TrackContextMenu track={currentTrack}>
                            <TrackCard track={currentTrack} variant="list"/>
                        </TrackContextMenu>
                    </section>
                )}

                {/* Next Up */}
                {queue.length > 0 && (
                    <section>
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">Next Up</h3>
                        <div className="space-y-1">
                            {queue.map((track, idx) => (
                                <TrackContextMenu key={`${track.id}-${idx}`} track={track}>
                                    <TrackCard track={track} variant="list"/>
                                </TrackContextMenu>
                            ))}
                        </div>
                    </section>
                )}

                {/* History */}
                {history.length > 0 && (
                    <section>
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-2 flex items-center gap-2">
                            <History size={14}/> Recently Played
                        </h3>
                        <div className="space-y-1 opacity-60 hover:opacity-100 transition-opacity">
                            {/* Reverse to show latest first */}
                            {[...history].reverse().map((track, idx) => (
                                <TrackContextMenu key={`history-${track.id}-${idx}`} track={track}>
                                    <TrackCard track={track} variant="list"/>
                                </TrackContextMenu>
                            ))}
                        </div>
                    </section>
                )}

                {!currentTrack && queue.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-40 text-slate-500 text-sm">
                        <ListMusic size={32} className="mb-2 opacity-50"/>
                        Queue is empty
                    </div>
                )}
            </div>
        </div>
    );
};