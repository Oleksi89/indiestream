import {useState, useEffect} from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {UserX, UserCheck, Loader2} from 'lucide-react';
import {useTranslation} from '@/shared/lib/i18n/useTranslation';

interface UserActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => void;
    isLoading: boolean;
    actionType: 'BAN' | 'UNBAN';
    targetUsername: string;
}

export const UserActionModal = ({
                                    isOpen,
                                    onClose,
                                    onConfirm,
                                    isLoading,
                                    actionType,
                                    targetUsername
                                }: UserActionModalProps) => {
    const [reason, setReason] = useState('');
    const {t} = useTranslation();
    const isBan = actionType === 'BAN';
    const dict = isBan ? t.auth.admin.banModal : t.auth.admin.unbanModal;

    useEffect(() => {
        if (!isOpen) setReason('');
    }, [isOpen]);

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => !open && !isLoading && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60]"/>
                <Dialog.Content
                    className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-[60] overflow-hidden p-6 animate-in zoom-in-95">
                    <div className="flex flex-col items-center text-center space-y-3 mb-6">
                        <div
                            className={`p-3 rounded-full ${isBan ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                            {isBan ? <UserX size={24}/> : <UserCheck size={24}/>}
                        </div>
                        <Dialog.Title className="text-xl font-bold text-slate-100">{dict.title}</Dialog.Title>
                        <Dialog.Description className="text-sm text-slate-400 leading-relaxed">
                            {dict.description.replace('{username}', targetUsername)}
                        </Dialog.Description>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                {dict.reasonLabel}
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                rows={3}
                                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 outline-none resize-none focus:border-violet-500"
                                required
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                        <button type="button" onClick={onClose} disabled={isLoading}
                                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-300 bg-slate-800 rounded-lg hover:bg-slate-700">
                            {dict.cancel}
                        </button>
                        <button
                            type="button"
                            onClick={() => onConfirm(reason)}
                            disabled={isLoading || !reason.trim()}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-white text-sm font-medium rounded-lg ${isBan ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
                            {isLoading
                                ? <><Loader2 size={16} className="animate-spin"/> {dict.confirming}</>
                                : <>{isBan ? <UserX size={16}/> : <UserCheck size={16}/>} {dict.confirm}</>
                            }
                        </button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};