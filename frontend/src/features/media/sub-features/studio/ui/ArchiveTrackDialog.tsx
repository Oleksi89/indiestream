import * as AlertDialog from '@radix-ui/react-alert-dialog';
import {AlertTriangle, Archive, Loader2} from 'lucide-react';
import type {TrackDto} from "@/features/media/types";
import {useArchiveTrack} from "@/features/media/hooks/useTrackMutations.ts";
import {useTranslation} from '@/shared/lib/i18n/useTranslation';

interface ArchiveTrackDialogProps {
    track: TrackDto;
    isOpen: boolean;
    onClose: () => void;
}

export const ArchiveTrackDialog = ({track, isOpen, onClose}: ArchiveTrackDialogProps) => {
    const {mutate: archiveTrack, isPending} = useArchiveTrack();
    const {t} = useTranslation();
    const ar = t.media.studio.archive;

    const handleArchive = (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent immediate closing to wait for mutation
        archiveTrack(track.id, {
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
                        <div className="p-3 bg-red-500/10 text-red-400 rounded-full">
                            <AlertTriangle size={24} aria-hidden="true"/>
                        </div>

                        <div>
                            <AlertDialog.Title className="text-xl font-bold text-slate-100">
                                {ar.title}
                            </AlertDialog.Title>
                            <AlertDialog.Description className="mt-2 text-sm text-slate-400 leading-relaxed">
                                {ar.description.replace('{title}', track.title)}
                                <span className="block mt-2 font-medium text-red-400/90 text-xs">
                                    {ar.warning}
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
                                {ar.cancel}
                            </button>
                        </AlertDialog.Cancel>
                        <AlertDialog.Action asChild>
                            <button
                                onClick={handleArchive}
                                disabled={isPending}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 shadow-lg shadow-red-900/20"
                            >
                                {isPending
                                    ? <><Loader2 size={16} className="animate-spin" aria-hidden="true"/> {ar.confirming}</>
                                    : <><Archive size={16} aria-hidden="true"/> {ar.confirm}</>}
                            </button>
                        </AlertDialog.Action>
                    </div>

                </AlertDialog.Content>
            </AlertDialog.Portal>
        </AlertDialog.Root>
    );
};
