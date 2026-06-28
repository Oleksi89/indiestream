import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {X, Mail, AlertTriangle} from 'lucide-react';
import {useTranslation} from '@/shared/lib/i18n/useTranslation';

interface ReportDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export const ReportDialog: React.FC<ReportDialogProps> = ({isOpen, onOpenChange}) => {
    const {t} = useTranslation();

    return (
        <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay
                    className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"/>
                <Dialog.Content
                    className="fixed left-[50%] top-[50%] z-[100] grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border border-slate-800 bg-slate-900 p-6 shadow-2xl rounded-xl sm:rounded-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">

                    <Dialog.Title className="text-lg font-semibold text-slate-100 flex items-center gap-2 m-0">
                        <AlertTriangle className="w-5 h-5 text-amber-500"/>
                        {t.common.report.title}
                    </Dialog.Title>

                    <div className="space-y-4 text-sm text-slate-300 mt-2">
                        <p>{t.common.report.instruction}</p>

                        <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800 flex items-center gap-3">
                            <Mail className="text-violet-400 w-5 h-5 shrink-0"/>
                            <a
                                href={`mailto:${t.common.report.email}`}
                                className="text-violet-400 font-medium hover:underline outline-none focus:text-violet-300"
                            >
                                {t.common.report.email}
                            </a>
                        </div>

                        <div>
                            <p className="font-medium text-slate-200 mb-2">{t.common.report.formatHeader}</p>
                            <ul className="space-y-2 list-disc pl-5 marker:text-slate-600">
                                <li><span
                                    className="font-semibold text-slate-200">{t.common.report.reqSubject.split(':')[0]}:</span> {t.common.report.reqSubject.split(':')[1]}
                                </li>
                                <li><span
                                    className="font-semibold text-slate-200">{t.common.report.reqTarget.split(':')[0]}:</span> {t.common.report.reqTarget.split(':')[1]}
                                </li>
                                <li><span
                                    className="font-semibold text-slate-200">{t.common.report.reqDescription.split(':')[0]}:</span> {t.common.report.reqDescription.split(':')[1]}
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                        <Dialog.Close asChild>
                            <button
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-sm font-medium transition-colors outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-slate-900">
                                {t.common.report.close}
                            </button>
                        </Dialog.Close>
                    </div>

                    <Dialog.Close asChild>
                        <button
                            className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 outline-none focus:ring-2 focus:ring-violet-500 text-slate-400 hover:text-slate-200">
                            <X className="h-4 w-4"/>
                            <span className="sr-only">Close</span>
                        </button>
                    </Dialog.Close>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};