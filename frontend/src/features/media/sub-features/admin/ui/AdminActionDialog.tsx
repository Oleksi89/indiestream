import React, {useState} from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {X, ShieldAlert, Loader2} from 'lucide-react';
import type {AdminVerdict} from '../../../types';
import {useExecuteVerdict} from '../hooks/useAdminMutations';
import {cn} from '@/shared/lib/utils';
import {useTranslation} from '@/shared/lib/i18n/useTranslation';

interface AdminActionDialogProps {
    trackId: string;
    verdict: AdminVerdict | null;
    onClose: () => void;
}

export const AdminActionDialog = ({trackId, verdict, onClose}: AdminActionDialogProps) => {
    const [reason, setReason] = useState('');
    const {mutate: execute, isPending} = useExecuteVerdict();
    const {t} = useTranslation();

    if (!verdict) return null;

    const ad = t.media.admin.actionDialog;

    const config = {
        APPROVE: {
            color: 'bg-emerald-600',
            hover: 'hover:bg-emerald-500',
            title: ad.approveTitle,
            desc: ad.approveDesc
        },
        REJECT: {
            color: 'bg-amber-600',
            hover: 'hover:bg-amber-500',
            title: ad.rejectTitle,
            desc: ad.rejectDesc
        },
        BAN: {
            color: 'bg-red-600',
            hover: 'hover:bg-red-500',
            title: ad.banTitle,
            desc: ad.banDesc
        },
        RESTORE: {
            color: 'bg-blue-600',
            hover: 'hover:bg-blue-500',
            title: ad.restoreTitle,
            desc: ad.restoreDesc
        },
        FORCE_ARCHIVE: {
            color: 'bg-slate-700',
            hover: 'hover:bg-slate-600',
            title: ad.forceArchiveTitle,
            desc: ad.forceArchiveDesc
        }
    }[verdict];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason.trim()) return;

        execute({
            trackId,
            payload: {verdict, reason: reason.trim()} // Skipping finalTags edit for brevity, relies on current state
        }, {onSuccess: onClose});
    };

    return (
        <Dialog.Root open={!!verdict} onOpenChange={(open) => !open && !isPending && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] animate-in fade-in"/>
                <Dialog.Content
                    className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-[60] overflow-hidden animate-in zoom-in-95">

                    <div
                        className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
                        <div className="flex items-center gap-2">
                            <ShieldAlert size={18} className="text-slate-400" aria-hidden="true"/>
                            <Dialog.Title className="text-lg font-semibold text-slate-100">{config.title}</Dialog.Title>
                        </div>
                        <Dialog.Close
                            disabled={isPending}
                            aria-label={ad.close}
                            title={ad.close}
                            className="text-slate-400 hover:text-white transition-colors">
                            <X size={20} aria-hidden="true"/>
                        </Dialog.Close>
                    </div>

                    <form id="verdict-form" onSubmit={handleSubmit} className="p-6">
                        <Dialog.Description className="text-sm text-slate-400 mb-6">
                            {config.desc}
                        </Dialog.Description>

                        <div className="space-y-2">
                            <label htmlFor="verdict-reason" className="text-sm font-medium text-slate-300">
                                {ad.reasonLabel} <span className="text-red-400">*</span>
                            </label>
                            <textarea
                                id="verdict-reason"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder={ad.reasonPlaceholder}
                                rows={4}
                                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 placeholder-slate-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all resize-none custom-scrollbar"
                                required
                            />
                        </div>
                    </form>

                    <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/50">
                        <button type="button" onClick={onClose} disabled={isPending}
                                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors">
                            {ad.cancel}
                        </button>
                        <button
                            type="submit"
                            form="verdict-form"
                            disabled={isPending || !reason.trim()}
                            className={cn("flex items-center gap-2 px-6 py-2 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50", config.color, config.hover)}
                        >
                            {isPending && <Loader2 size={16} className="animate-spin" aria-hidden="true"/>}
                            {isPending ? ad.executing : ad.execute}
                        </button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};
