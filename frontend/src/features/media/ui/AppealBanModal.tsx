import React, {useState} from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {X, Gavel, AlertTriangle} from 'lucide-react';
import {useAppealBan} from '../hooks/useTrackMutations';
import type {TrackDto} from '../types';

interface AppealBanModalProps {
    track: TrackDto;
    isOpen: boolean;
    onClose: () => void;
}

export const AppealBanModal = ({track, isOpen, onClose}: AppealBanModalProps) => {
    const [reason, setReason] = useState('');
    const {mutate: appealBan, isPending} = useAppealBan();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        appealBan({trackId: track.id, payload: {reason}}, {
            onSuccess: () => {
                onClose();
                setReason('');
            }
        });
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 animate-in fade-in"/>
                <Dialog.Content
                    className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 p-6 animate-in zoom-in-95">

                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-500/10 text-red-400 rounded-lg">
                                <Gavel size={20}/>
                            </div>
                            <div>
                                <Dialog.Title className="text-lg font-semibold text-slate-100">Appeal Moderation
                                    Decision</Dialog.Title>
                                <Dialog.Description
                                    className="text-sm text-slate-400">Track: {track.title}</Dialog.Description>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                            <X size={20}/>
                        </button>
                    </div>

                    <div
                        className="mb-6 p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-200/80 text-sm flex gap-3">
                        <AlertTriangle size={18} className="shrink-0 text-amber-400"/>
                        <p>You have <strong>one</strong> appeal opportunity per track. Please provide a detailed
                            explanation of why you believe this track complies with our guidelines.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Explain why the moderation decision should be reversed... (minimum 20 characters)"
                                className="w-full h-32 rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm text-slate-100 placeholder-slate-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none resize-none"
                                required
                                minLength={20}
                            />
                            <div className="flex justify-end mt-1">
                                <span className={`text-xs ${reason.length < 20 ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {reason.length}/1000 characters
                                </span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                            <button type="button" onClick={onClose}
                                    className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors">
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isPending || reason.length < 20}
                                className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                                {isPending ? 'Submitting...' : 'Submit Appeal'}
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};