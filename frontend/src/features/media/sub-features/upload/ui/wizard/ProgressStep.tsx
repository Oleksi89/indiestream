import {useEffect, useRef} from 'react';
import {useUploadWizardStore} from '../../hooks/useUploadWizardStore.ts';
import {useUploadTrack} from '../../../../hooks/useTrackMutations.ts';
import {useTrackStatusPoll} from '../../../../hooks/useTrackQueries.ts';
import {useAuthStore} from '@/shared/store/authStore.ts';
import {Loader2, CheckCircle2, Server, BrainCircuit, Check, XCircle} from 'lucide-react';
import {TrackStatusBadge} from '../../../moderation/ui/TrackStatusBadge.tsx';
import toast from 'react-hot-toast';

interface ProgressStepProps {
    onComplete: () => void;
}

export const ProgressStep = ({onComplete}: ProgressStepProps) => {
    const {
        currentStep, metadata, masterFile, coverFile, stems,
        uploadProgress, uploadedTrackId, setStep, uploadError, setUploadError
    } = useUploadWizardStore();

    const user = useAuthStore(state => state.user);
    const {mutate: uploadTrack} = useUploadTrack();

    const hasStartedRef = useRef(false);

    useEffect(() => {
        if (currentStep === 'UPLOADING' && !hasStartedRef.current && !uploadError) {
            if (!user?.id || !masterFile) {
                toast.error("Session or files lost. Please try again.");
                setStep('MEDIA');
                return;
            }

            hasStartedRef.current = true;

            uploadTrack({
                artistId: String(user.id),
                title: metadata.title,
                file: masterFile,
                cover: coverFile,
                stems: stems,
                genre: metadata.genre,
                isExplicit: metadata.isExplicit,
                customTags: metadata.customTags,
            });
        }
    }, [currentStep, user?.id, masterFile, coverFile, stems, metadata, uploadTrack, setStep, uploadError]);

    const {data: trackData} = useTrackStatusPoll(uploadedTrackId);

    const isProcessing = trackData?.status === 'PROCESSING';
    const isAiAnalysis = trackData?.status === 'AI_ANALYSIS';
    const isTerminal = trackData && !['PROCESSING', 'AI_ANALYSIS'].includes(trackData.status);

    // ERROR UI
    if (uploadError) {
        return (
            <div
                className="flex flex-col items-center justify-center py-8 space-y-6 animate-in fade-in zoom-in-95 duration-300">
                <div
                    className="relative flex items-center justify-center w-24 h-24 rounded-full bg-red-500/10 border border-red-500/20">
                    <XCircle size={48} className="text-red-400"/>
                </div>
                <div className="text-center space-y-2 max-w-md">
                    <h3 className="text-xl font-semibold text-slate-100">Upload Failed</h3>
                    <p className="text-sm text-red-400 font-medium">{uploadError}</p>
                </div>
                <button
                    onClick={() => {
                        setUploadError(null);
                        setStep('METADATA'); // Send them back to check tags/data
                    }}
                    className="mt-6 bg-slate-800 hover:bg-slate-700 text-white px-8 py-2.5 rounded-lg font-medium transition-colors"
                >
                    Review Details & Try Again
                </button>
            </div>
        );
    }

    // NORMAL PROGRESS UI
    return (
        <div className="flex flex-col items-center justify-center py-8 space-y-8 animate-in fade-in duration-500">
            {/* Visualizer */}
            <div className="relative flex items-center justify-center w-32 h-32">
                {currentStep === 'UPLOADING' && (
                    <>
                        <svg className="absolute w-full h-full transform -rotate-90">
                            <circle cx="64" cy="64" r="60" className="stroke-slate-800 fill-none stroke-[8]"/>
                            <circle
                                cx="64" cy="64" r="60"
                                className="stroke-violet-500 fill-none stroke-[8] transition-all duration-300 ease-out"
                                strokeDasharray="377"
                                strokeDashoffset={377 - (377 * uploadProgress) / 100}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="text-xl font-bold text-white">{uploadProgress}%</div>
                    </>
                )}
                {currentStep === 'PROCESSING' && (
                    <div className="relative">
                        <div className="absolute inset-0 bg-violet-500/20 blur-xl rounded-full animate-pulse"/>
                        {isProcessing ? <Server size={48} className="text-violet-400 animate-pulse"/> :
                            isAiAnalysis ? <BrainCircuit size={48} className="text-indigo-400 animate-bounce"/> :
                                <CheckCircle2 size={56} className="text-emerald-400"/>}
                    </div>
                )}
            </div>

            <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold text-slate-100">
                    {currentStep === 'UPLOADING' ? 'Uploading Media Assets...' : 'Running Server Pipeline'}
                </h3>

                {currentStep === 'PROCESSING' && (
                    <div className="flex flex-col items-center gap-3 mt-4 text-sm text-slate-400">
                        <p className="text-xs text-amber-400/80 mb-2">You can safely close this window. Processing will
                            continue in the background.</p>

                        <div className="flex items-center gap-2">
                            {isProcessing ? <Loader2 size={14} className="animate-spin text-blue-400"/> :
                                <Check size={14} className="text-emerald-500"/>}
                            <span>FFmpeg Audio Processing & Anti-Spoofing</span>
                        </div>
                        {(isAiAnalysis || isTerminal) && (
                            <div className="flex items-center gap-2 animate-in slide-in-from-bottom-2">
                                {isAiAnalysis ? <Loader2 size={14} className="animate-spin text-indigo-400"/> :
                                    <Check size={14} className="text-emerald-500"/>}
                                <span>Gemini AI Moderation & Auto-Tagging</span>
                            </div>
                        )}

                        {trackData && (
                            <div
                                className="mt-4 pt-4 border-t border-slate-800 w-full flex flex-col items-center gap-2 animate-in fade-in">
                                <span className="text-xs font-medium uppercase tracking-wider">Final State:</span>
                                <TrackStatusBadge status={trackData.status}/>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {currentStep === 'PROCESSING' && (
                <button onClick={onComplete}
                        className="mt-8 bg-slate-800 hover:bg-slate-700 text-white px-8 py-2.5 rounded-lg font-medium transition-colors">
                    Close Wizard
                </button>
            )}
        </div>
    );
};