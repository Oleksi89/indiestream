import * as AlertDialog from '@radix-ui/react-alert-dialog';
import {Globe, Loader2} from 'lucide-react';
import type {TrackDto} from "@/features/media/types";
import {usePublishTrack} from "@/features/media/hooks/useTrackMutations.ts";


interface PublishTrackDialogProps {
    track: TrackDto;
    isOpen: boolean;
    onClose: () => void;
}

export const PublishTrackDialog = ({track, isOpen, onClose}: PublishTrackDialogProps) => {
    const {mutate: publishTrack, isPending} = usePublishTrack();

    const handlePublish = (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent immediate closing to wait for mutation
        publishTrack(track.id, {
            onSuccess: () => {
                onClose();
            }
        });
    };

    return (
        <AlertDialog.Root open={isOpen} onOpenChange={(open) => !open && !isPending && onClose()}>
            <AlertDialog.Portal>
                <AlertDialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 animate-in fade-in"/>
                <AlertDialog.Content
                    className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 p-6 animate-in zoom-in-95">

                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-full">
                            <Globe size={24}/>
                        </div>

                        <div>
                            <AlertDialog.Title className="text-xl font-bold text-slate-100">
                                Publish Track
                            </AlertDialog.Title>
                            <AlertDialog.Description className="mt-2 text-sm text-slate-400 leading-relaxed">
                                Are you ready to release <span
                                className="text-slate-200 font-semibold">"{track.title}"</span>?
                                Once published, the track will be visible in the global feed and your public profile.
                                <br/><br/>
                                <span className="text-amber-400/90 text-xs font-medium">
                                    Note: Future metadata changes will require a brief re-moderation period.
                                </span>
                            </AlertDialog.Description>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-8">
                        <AlertDialog.Cancel asChild>
                            <button
                                disabled={isPending}
                                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                        </AlertDialog.Cancel>
                        <AlertDialog.Action asChild>
                            <button
                                onClick={handlePublish}
                                disabled={isPending}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 shadow-lg shadow-emerald-900/20"
                            >
                                {isPending ? <Loader2 size={16} className="animate-spin"/> : <Globe size={16}/>}
                                {isPending ? 'Publishing...' : 'Publish Now'}
                            </button>
                        </AlertDialog.Action>
                    </div>

                </AlertDialog.Content>
            </AlertDialog.Portal>
        </AlertDialog.Root>
    );
};