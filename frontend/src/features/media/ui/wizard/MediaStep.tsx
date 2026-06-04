import React, {useState} from 'react';
import {useUploadWizardStore} from '../../hooks/useUploadWizardStore';
import {MEDIA_LIMITS} from '../../types/track.schema';
import {UploadCloud, FileAudio, Image as ImageIcon, X, ArrowLeft, ArrowRight, Loader2} from 'lucide-react';
import {cn} from '@/shared/lib/utils';
import toast from 'react-hot-toast';

export const MediaStep = () => {
    const {masterFile, coverFile, setFiles, setStep} = useUploadWizardStore();
    const [localMaster, setLocalMaster] = useState<File | null>(masterFile);
    const [localCover, setLocalCover] = useState<File | null>(coverFile);
    const [isDraggingAudio, setIsDraggingAudio] = useState(false);
    const [isDraggingCover, setIsDraggingCover] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);

    const validateFile = (file: File, type: 'audio' | 'image'): boolean => {
        if (type === 'audio') {
            if (!MEDIA_LIMITS.AUDIO_TYPES.includes(file.type as any)) {
                toast.error('Invalid audio format. Use WAV, FLAC, or MP3.');
                return false;
            }
            if (file.size > MEDIA_LIMITS.MAX_AUDIO_SIZE) {
                toast.error('Audio file must be < 50MB.');
                return false;
            }
        } else {
            if (!MEDIA_LIMITS.IMAGE_TYPES.includes(file.type as any)) {
                toast.error('Invalid image format. Use JPEG, PNG, or WEBP.');
                return false;
            }
            if (file.size > MEDIA_LIMITS.MAX_IMAGE_SIZE) {
                toast.error('Cover image must be < 5MB.');
                return false;
            }
        }
        return true;
    };

    const handleDrop = (e: React.DragEvent, type: 'audio' | 'image') => {
        e.preventDefault();
        type === 'audio' ? setIsDraggingAudio(false) : setIsDraggingCover(false);
        const file = e.dataTransfer.files?.[0];
        if (file && validateFile(file, type)) {
            type === 'audio' ? setLocalMaster(file) : setLocalCover(file);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'audio' | 'image') => {
        const file = e.target.files?.[0];
        if (file && validateFile(file, type)) {
            type === 'audio' ? setLocalMaster(file) : setLocalCover(file);
        }
    };

    const handleNext = () => {
        if (isTransitioning) return;
        if (!localMaster) {
            toast.error('A master audio file is required to proceed.');
            return;
        }

        setIsTransitioning(true);
        setFiles(localMaster, localCover);

        // 1-second UI lock to prevent double clicks and allow state to settle
        setTimeout(() => {
            setStep('STEMS');
        }, 1000);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Audio Dropzone */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Master Audio <span
                        className="text-red-400">*</span></label>
                    <div
                        onDragOver={(e) => {
                            e.preventDefault();
                            setIsDraggingAudio(true);
                        }}
                        onDragLeave={() => setIsDraggingAudio(false)}
                        onDrop={(e) => handleDrop(e, 'audio')}
                        className={cn(
                            "relative flex flex-col items-center justify-center w-full h-40 px-4 transition-all border-2 border-dashed rounded-xl appearance-none",
                            isDraggingAudio ? "border-violet-500 bg-violet-500/10" : "border-slate-700 bg-slate-900/50 hover:bg-slate-800/50 hover:border-slate-600",
                            localMaster && "border-violet-500/50 bg-slate-800/30"
                        )}
                    >
                        {localMaster ? (
                            <div className="flex flex-col items-center text-center space-y-2">
                                <FileAudio className="text-violet-400" size={32}/>
                                <span
                                    className="font-medium text-slate-200 text-sm max-w-[200px] truncate">{localMaster.name}</span>
                                <span
                                    className="text-xs text-slate-500">{(localMaster.size / (1024 * 1024)).toFixed(2)} MB</span>
                                <button onClick={() => setLocalMaster(null)}
                                        className="absolute top-2 right-2 p-1.5 bg-slate-900 rounded-md text-slate-400 hover:text-red-400 transition-colors">
                                    <X size={14}/>
                                </button>
                            </div>
                        ) : (
                            <>
                                <UploadCloud className="text-slate-400 mb-2" size={32}/>
                                <p className="text-sm font-medium text-slate-300">Drag & drop master track</p>
                                <p className="text-xs text-slate-500 mt-1">WAV, FLAC, MP3 up to 50MB</p>
                                <label className="absolute inset-0 cursor-pointer">
                                    <input type="file" className="hidden" accept=".wav,.flac,.mp3"
                                           onChange={(e) => handleChange(e, 'audio')}/>
                                </label>
                            </>
                        )}
                    </div>
                </div>

                {/* Cover Dropzone */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Cover Art (Optional)</label>
                    <div
                        onDragOver={(e) => {
                            e.preventDefault();
                            setIsDraggingCover(true);
                        }}
                        onDragLeave={() => setIsDraggingCover(false)}
                        onDrop={(e) => handleDrop(e, 'image')}
                        className={cn(
                            "relative flex flex-col items-center justify-center w-full h-40 px-4 transition-all border-2 border-dashed rounded-xl appearance-none",
                            isDraggingCover ? "border-violet-500 bg-violet-500/10" : "border-slate-700 bg-slate-900/50 hover:bg-slate-800/50 hover:border-slate-600",
                            localCover && "border-violet-500/50 bg-slate-800/30 overflow-hidden"
                        )}
                    >
                        {localCover ? (
                            <>
                                <img src={URL.createObjectURL(localCover)} alt="Cover Preview"
                                     className="absolute inset-0 w-full h-full object-cover opacity-40 blur-[2px]"/>
                                <div className="relative z-10 flex flex-col items-center text-center space-y-2">
                                    <ImageIcon className="text-white drop-shadow-md" size={32}/>
                                    <span
                                        className="font-medium text-white text-sm drop-shadow-md max-w-[200px] truncate">{localCover.name}</span>
                                </div>
                                <button onClick={() => setLocalCover(null)}
                                        className="absolute z-20 top-2 right-2 p-1.5 bg-slate-900/80 backdrop-blur rounded-md text-slate-300 hover:text-red-400 transition-colors">
                                    <X size={14}/>
                                </button>
                            </>
                        ) : (
                            <>
                                <ImageIcon className="text-slate-400 mb-2" size={32}/>
                                <p className="text-sm font-medium text-slate-300">Drag & drop cover art</p>
                                <p className="text-xs text-slate-500 mt-1">JPEG, PNG, WEBP up to 5MB</p>
                                <label className="absolute inset-0 cursor-pointer">
                                    <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp"
                                           onChange={(e) => handleChange(e, 'image')}/>
                                </label>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setStep('METADATA')} disabled={isTransitioning}
                        className="flex items-center gap-2 px-4 py-2.5 text-slate-300 hover:text-white transition-colors disabled:opacity-50">
                    <ArrowLeft size={16}/> Back
                </button>
                <button type="button" onClick={handleNext} disabled={isTransitioning}
                        className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 text-white px-6 py-2.5 rounded-lg font-medium transition-colors">
                    {isTransitioning ? <Loader2 size={16} className="animate-spin"/> : <>Continue to Stems <ArrowRight
                        size={16}/></>}
                </button>
            </div>
        </div>
    );
};