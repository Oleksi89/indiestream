import {useState} from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {useUploadWizardStore} from '../hooks/useUploadWizardStore.ts';
import {MetadataStep} from './wizard/MetadataStep.tsx';
import {MediaStep} from './wizard/MediaStep.tsx';
import {StemsStep} from './wizard/StemsStep.tsx';
import {ProgressStep} from './wizard/ProgressStep.tsx';
import {X} from 'lucide-react';
import {cn} from '@/shared/lib/utils.ts';

export const UploadWizardModal = () => {
    const [isOpen, setIsOpen] = useState(false);
    const {currentStep, resetWizard} = useUploadWizardStore();

    const handleOpenChange = (open: boolean) => {
        // Prevent accidental closing during network operations
        if (!open && (currentStep === 'UPLOADING' || currentStep === 'PROCESSING')) {
            return;
        }
        if (!open) {
            resetWizard();
        }
        setIsOpen(open);
    };

    const handleWizardComplete = () => {
        setIsOpen(false);
        resetWizard();
    };

    // Steps visualization logic
    const steps = ['METADATA', 'MEDIA', 'STEMS', 'PROCESSING'];
    const activeIndex = currentStep === 'UPLOADING' ? 3 : steps.indexOf(currentStep);

    return (
        <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
            <Dialog.Trigger asChild>
                <button
                    className="bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-violet-900/20">
                    Upload New Release
                </button>
            </Dialog.Trigger>

            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 animate-in fade-in"/>
                <Dialog.Content
                    className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in zoom-in-95 duration-200">

                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                        <Dialog.Title className="text-lg font-semibold text-slate-100">Publish Track</Dialog.Title>
                        <Dialog.Close asChild>
                            <button className="text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                                    disabled={currentStep === 'UPLOADING' || currentStep === 'PROCESSING'}>
                                <X size={20}/>
                            </button>
                        </Dialog.Close>
                    </div>

                    {/* Stepper Progress */}
                    <div className="flex items-center justify-between px-8 py-4 bg-slate-950/50">
                        {['Metadata', 'Media', 'Stems', 'Process'].map((label, idx) => (
                            <div key={label} className="flex flex-col items-center gap-2">
                                <div className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                                    idx < activeIndex ? "bg-violet-600 text-white" :
                                        idx === activeIndex ? "bg-violet-500 ring-4 ring-violet-500/20 text-white" :
                                            "bg-slate-800 text-slate-500"
                                )}>
                                    {idx + 1}
                                </div>
                                <span
                                    className={cn("text-[10px] uppercase tracking-wider font-semibold", idx <= activeIndex ? "text-slate-300" : "text-slate-600")}>
                                    {label}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Body Content */}
                    <div className="p-6">
                        {currentStep === 'METADATA' && <MetadataStep/>}
                        {currentStep === 'MEDIA' && <MediaStep/>}
                        {currentStep === 'STEMS' && <StemsStep/>}
                        {(currentStep === 'UPLOADING' || currentStep === 'PROCESSING') && (
                            <ProgressStep onComplete={handleWizardComplete}/>
                        )}
                    </div>

                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};