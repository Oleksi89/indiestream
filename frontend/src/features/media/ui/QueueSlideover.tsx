import {usePlayerStore} from '@/shared/store/playerStore';
import {TrackCard} from './TrackCard';
import {X, ListMusic, History, GripVertical} from 'lucide-react';
import {TrackContextMenu} from './TrackContextMenu';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors
} from '@dnd-kit/core';
import type {DragEndEvent, UniqueIdentifier} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import type {TrackDto} from '../types';

interface SortableTrackItemProps {
    track: TrackDto;
    id: UniqueIdentifier;
}

const SortableTrackItem = ({track, id}: SortableTrackItemProps) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({id});

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        opacity: isDragging ? 0.8 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-2 group/dnd">
            <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400 opacity-0 group-hover/dnd:opacity-100 transition-opacity outline-none"
            >
                <GripVertical size={16}/>
            </div>
            <div className="flex-1 min-w-0 pointer-events-auto">
                <TrackContextMenu track={track}>
                    <TrackCard track={track} variant="list"/>
                </TrackContextMenu>
            </div>
        </div>
    );
};

export const QueueSlideover = () => {
    const {isQueueOpen, toggleQueue, currentTrack, queue, history, reorderQueue} = usePlayerStore();

    const sensors = useSensors(
        useSensor(PointerSensor, {activationConstraint: {distance: 5}}),
        useSensor(KeyboardSensor, {coordinateGetter: sortableKeyboardCoordinates})
    );

    // Generate deterministic unique IDs to prevent conflicts with duplicate tracks in the queue
    const queueIds = queue.map((track, index) => `${track.id}-idx-${index}`);

    const handleDragEnd = (event: DragEndEvent) => {
        const {active, over} = event;

        if (over && active.id !== over.id) {
            const oldIndex = queueIds.indexOf(active.id as string);
            const newIndex = queueIds.indexOf(over.id as string);

            if (oldIndex !== -1 && newIndex !== -1) {
                reorderQueue(oldIndex, newIndex);
            }
        }
    };

    if (!isQueueOpen) return null;

    return (
        <div
            className="absolute right-0 top-0 bottom-0 w-96 bg-slate-900 border-l border-slate-800 shadow-2xl z-[40] flex flex-col pt-4 pb-24 animate-in slide-in-from-right duration-200">
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
                        <div className="pl-6">
                            <TrackContextMenu track={currentTrack}>
                                <TrackCard track={currentTrack} variant="list"/>
                            </TrackContextMenu>
                        </div>
                    </section>
                )}

                {/* Next Up */}
                {queue.length > 0 && (
                    <section>
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">Next Up</h3>
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={queueIds} strategy={verticalListSortingStrategy}>
                                <div className="space-y-1">
                                    {queue.map((track, idx) => (
                                        <SortableTrackItem
                                            key={queueIds[idx]}
                                            id={queueIds[idx]}
                                            track={track}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    </section>
                )}

                {/* History */}
                {history.length > 0 && (
                    <section>
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-2 flex items-center gap-2">
                            <History size={14}/> Recently Played
                        </h3>
                        <div className="space-y-1 opacity-60 hover:opacity-100 transition-opacity pl-6">
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