import React, {useState} from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {X, Sparkles, AlertCircle, ArrowRight} from 'lucide-react';
import {useAcceptAiTags, useProposeCustomTags} from '../../../hooks/useTrackMutations.ts';
import type {TrackDto} from '../../../types';
import {useTranslation} from '@/shared/lib/i18n/useTranslation';

interface TrackResolutionModalProps {
    track: TrackDto;
    isOpen: boolean;
    onClose: () => void;
}

export const TrackResolutionModal = ({track, isOpen, onClose}: TrackResolutionModalProps) => {
    const [mode, setMode] = useState<'VIEW' | 'PROPOSE'>('VIEW');
    const [justification, setJustification] = useState('');
    const {t} = useTranslation();
    const rs = t.media.moderation.resolution;

    const {mutate: acceptTags, isPending: isAccepting} = useAcceptAiTags();
    const {mutate: proposeTags, isPending: isProposing} = useProposeCustomTags();

    const aiTags = track.tags?.aiGenerated || [];
    const customTags = track.tags?.custom || [];

    const handleAccept = () => {
        acceptTags(track.id, {onSuccess: onClose});
    };

    const handlePropose = (e: React.FormEvent) => {
        e.preventDefault();
        proposeTags({
            trackId: track.id,
            payload: {
                proposedTags: track.tags!, // Send current combined state
                justification
            }
        }, {onSuccess: onClose});
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 animate-in fade-in"/>
                <Dialog.Content
                    className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 p-6 animate-in zoom-in-95">

                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                                <Sparkles size={20} aria-hidden="true"/>
                            </div>
                            <div>
                                <Dialog.Title className="text-lg font-semibold text-slate-100">{rs.title}</Dialog.Title>
                                <Dialog.Description className="text-sm text-slate-400">{track.title}</Dialog.Description>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            aria-label={rs.close}
                            title={rs.close}
                            className="text-slate-400 hover:text-white transition-colors">
                            <X size={20} aria-hidden="true"/>
                        </button>
                    </div>

                    <div className="mb-6 p-4 rounded-xl border border-slate-700 bg-slate-800/50">
                        <p className="text-sm text-slate-300">{rs.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="p-4 rounded-xl border border-slate-700 bg-slate-950">
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{rs.yourTags}</h4>
                            <div className="flex flex-wrap gap-2">
                                {customTags.length ? customTags.map(tag => (
                                    <span key={tag}
                                          className="px-2 py-1 bg-slate-800 text-slate-300 text-xs rounded">{tag}</span>
                                )) : <span className="text-slate-500 text-xs">{rs.none}</span>}
                            </div>
                        </div>
                        <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5">
                            <h4 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                <Sparkles size={12} aria-hidden="true"/> {rs.aiSuggestions}
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {aiTags.length ? aiTags.map(tag => (
                                    <span key={tag}
                                          className="px-2 py-1 bg-indigo-500/20 text-indigo-300 text-xs rounded">{tag}</span>
                                )) : <span className="text-slate-500 text-xs">{rs.none}</span>}
                            </div>
                        </div>
                    </div>

                    {mode === 'VIEW' ? (
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                            <button onClick={() => setMode('PROPOSE')}
                                    className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors">
                                {rs.proposeChanges}
                            </button>
                            <button
                                onClick={handleAccept}
                                disabled={isAccepting}
                                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                            >
                                {isAccepting ? rs.accepting : rs.acceptSuggestions}
                                <ArrowRight size={16} aria-hidden="true"/>
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handlePropose} className="space-y-4 animate-in slide-in-from-bottom-2">
                            <div>
                                <label htmlFor="justification" className="block text-sm font-medium text-slate-300 mb-2">
                                    {rs.justificationLabel} <span className="text-red-400">*</span>
                                </label>
                                <textarea
                                    id="justification"
                                    value={justification}
                                    onChange={(e) => setJustification(e.target.value)}
                                    placeholder={rs.justificationPlaceholder}
                                    className="w-full h-24 rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                                    required minLength={10}
                                />
                            </div>
                            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                                <div className="text-xs text-amber-400 flex items-center gap-1">
                                    <AlertCircle size={14} aria-hidden="true"/> {rs.adminReviewNote}
                                </div>
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setMode('VIEW')}
                                            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors">
                                        {rs.back}
                                    </button>
                                    <button type="submit" disabled={isProposing || justification.length < 10}
                                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors">
                                        {isProposing ? rs.submitting : rs.submitForReview}
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}

                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};
