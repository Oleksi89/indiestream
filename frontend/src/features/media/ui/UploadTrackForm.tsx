import {useState} from 'react';
import {useForm, type SubmitHandler} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {mediaApi} from '../api/media.api';
import {useAuthStore} from '@/shared/store/authStore';
import {isAxiosError} from 'axios';
import {UploadCloud, FileAudio, Image as ImageIcon, AlertCircle, CheckCircle2, Plus, X} from 'lucide-react';
import type {StemUploadPayload} from "@/features/media/types";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/flac'];
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const uploadSchema = z.object({
    title: z.string().min(1, "Track title is required").max(100, "Title is too long"),
});

type FormValues = z.infer<typeof uploadSchema>;

export const UploadTrackForm = () => {
    const user = useAuthStore((state) => state.user);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedCover, setSelectedCover] = useState<File | null>(null);
    const [stems, setStems] = useState<StemUploadPayload[]>([]);

    const [fileError, setFileError] = useState<string | null>(null);
    const [serverError, setServerError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        formState: {errors, isSubmitting},
    } = useForm({
        resolver: zodResolver(uploadSchema),
        defaultValues: {title: ''}
    });

    const validateAudioFile = (file: File): boolean => {
        if (!ACCEPTED_AUDIO_TYPES.includes(file.type)) {
            setFileError("Only MP3, WAV, and FLAC formats are supported.");
            return false;
        }
        if (file.size > MAX_FILE_SIZE) {
            setFileError("Audio file size must be less than 50MB.");
            return false;
        }
        return true;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFileError(null);
        setSuccess(false);

        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            if (validateAudioFile(file)) setSelectedFile(file);
            else setSelectedFile(null);
        }
    };

    const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFileError(null);

        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];

            if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
                setFileError("Only JPEG, PNG, and WEBP formats are supported for covers.");
                setSelectedCover(null);
                return;
            }

            if (file.size > MAX_IMAGE_SIZE) {
                setFileError("Cover image size must be less than 5MB.");
                setSelectedCover(null);
                return;
            }

            setSelectedCover(file);
        }
    };

    const addStem = () => {
        setStems([...stems, {name: '', file: null as unknown as File}]);
    };

    const removeStem = (index: number) => {
        setStems(stems.filter((_, i) => i !== index));
    };

    const handleStemNameChange = (index: number, name: string) => {
        const updatedStems = [...stems];
        updatedStems[index].name = name;
        setStems(updatedStems);
    };

    const handleStemFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        setFileError(null);
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            if (validateAudioFile(file)) {
                const updatedStems = [...stems];
                updatedStems[index].file = file;
                setStems(updatedStems);
            }
        }
    };

    const onSubmit: SubmitHandler<FormValues> = async (data) => {
        if (!selectedFile) {
            setFileError("Please select a master audio file to upload.");
            return;
        }

        // Validate stems
        const invalidStem = stems.find(s => !s.name.trim() || !s.file);
        if (invalidStem) {
            setFileError("All stems must have a name and a valid audio file attached.");
            return;
        }

        if (!user?.id) {
            setServerError("Authentication error. Artist ID is missing.");
            return;
        }

        try {
            setServerError(null);
            await mediaApi.uploadTrack(String(user.id), data.title, selectedFile, selectedCover || undefined, stems);

            setSuccess(true);
            reset();
            setSelectedFile(null);
            setSelectedCover(null);
            setStems([]);
        } catch (error: unknown) {
            if (isAxiosError(error)) {
                setServerError(error.response?.data?.detail || 'Failed to upload track.');
            } else {
                setServerError('An unexpected network error occurred.');
            }
        }
    };

    return (
        <div className="w-full max-w-4xl rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">Upload Track & Stems</h2>
                <p className="text-slate-400 text-sm mt-1">Upload your master track, cover art, and separate stems for
                    interactive playback.</p>
            </div>

            {success && (
                <div
                    className="mb-6 flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-400">
                    <CheckCircle2 size={20}/>
                    <p className="text-sm font-medium">Track and stems uploaded successfully to storage.</p>
                </div>
            )}

            {serverError && (
                <div
                    className="mb-6 flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-400">
                    <AlertCircle size={20}/>
                    <p className="text-sm font-medium">{serverError}</p>
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                {/* Basic Info */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Track Title</label>
                        <input
                            {...register('title')}
                            type="text"
                            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all"
                            placeholder="e.g. Midnight City"
                        />
                        {errors.title && <p className="text-red-400 text-xs mt-2">{errors.title.message}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Master Audio File *</label>
                            <label htmlFor="audio-upload"
                                   className={`flex flex-col items-center justify-center w-full h-32 px-4 transition-all border-2 border-dashed rounded-xl appearance-none cursor-pointer hover:border-violet-500/50 hover:bg-slate-800/50 ${selectedFile ? 'border-violet-500 bg-slate-800/30' : 'border-slate-700 bg-slate-950'}`}>
                                <div className="flex flex-col items-center space-y-2 text-center">
                                    {selectedFile ? (
                                        <>
                                            <FileAudio className="text-violet-400" size={28}/>
                                            <span
                                                className="font-medium text-slate-200 text-sm line-clamp-1">{selectedFile.name}</span>
                                        </>
                                    ) : (
                                        <>
                                            <UploadCloud className="text-slate-400" size={28}/>
                                            <span className="text-xs text-slate-500">MP3, WAV, FLAC</span>
                                        </>
                                    )}
                                </div>
                                <input id="audio-upload" type="file" accept=".mp3,.wav,.flac" className="hidden"
                                       onChange={handleFileChange}/>
                            </label>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Cover Art
                                (Optional)</label>
                            <label htmlFor="cover-upload"
                                   className={`flex flex-col items-center justify-center w-full h-32 px-4 transition-all border-2 border-dashed rounded-xl appearance-none cursor-pointer hover:border-violet-500/50 hover:bg-slate-800/50 ${selectedCover ? 'border-violet-500 bg-slate-800/30' : 'border-slate-700 bg-slate-950'}`}>
                                <div className="flex flex-col items-center space-y-2 text-center">
                                    {selectedCover ? (
                                        <>
                                            <ImageIcon className="text-violet-400" size={28}/>
                                            <span
                                                className="font-medium text-slate-200 text-sm line-clamp-1">{selectedCover.name}</span>
                                        </>
                                    ) : (
                                        <>
                                            <ImageIcon className="text-slate-400" size={28}/>
                                            <span className="text-xs text-slate-500">JPEG, PNG, WEBP</span>
                                        </>
                                    )}
                                </div>
                                <input id="cover-upload" type="file" accept="image/jpeg,image/png,image/webp"
                                       className="hidden" onChange={handleCoverChange}/>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Stems Section */}
                <div className="pt-6 border-t border-slate-800">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-medium text-slate-200">Interactive Stems</h3>
                            <p className="text-xs text-slate-500">Add separate instrument tracks for the dynamic
                                player.</p>
                        </div>
                        <button type="button" onClick={addStem}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-violet-400 bg-violet-400/10 rounded-lg hover:bg-violet-400/20 transition-colors">
                            <Plus size={16}/> Add Stem
                        </button>
                    </div>

                    <div className="space-y-3">
                        {stems.map((stem, index) => (
                            <div key={index}
                                 className="flex flex-col md:flex-row items-start md:items-center gap-3 p-4 rounded-xl border border-slate-700 bg-slate-800/50">
                                <input
                                    type="text"
                                    placeholder="Stem Name (e.g. Drums, Vocals)"
                                    value={stem.name}
                                    onChange={(e) => handleStemNameChange(index, e.target.value)}
                                    className="flex-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-violet-500 outline-none"
                                />
                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    <label className="flex-1 md:w-48 relative cursor-pointer min-w-0">
                                        <div
                                            className={`flex items-center justify-center gap-2 px-4 py-2.5 border rounded-lg text-sm transition-colors ${stem.file ? 'border-violet-500 bg-violet-500/10 text-violet-300' : 'border-slate-600 bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                                            <FileAudio size={16} className="shrink-0"/>
                                            <span
                                                className="truncate">{stem.file ? stem.file.name : 'Choose File'}</span>
                                        </div>
                                        <input
                                            type="file"
                                            accept=".mp3,.wav,.flac"
                                            className="hidden"
                                            onChange={(e) => handleStemFileChange(index, e)}
                                            // key to force React to redraw input when file is reset
                                            key={stem.file ? stem.file.name : 'empty'}
                                        />
                                    </label>

                                    <button
                                        type="button"
                                        onClick={() => removeStem(index)}
                                        className="shrink-0 relative z-10 p-2.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors cursor-pointer"
                                        title="Remove stem"
                                    >
                                        <X size={18}/>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {fileError && <p className="text-red-400 text-xs text-center">{fileError}</p>}

                <button
                    type="submit"
                    disabled={isSubmitting || !selectedFile}
                    className="w-full flex justify-center py-3.5 px-4 rounded-lg font-semibold text-white bg-violet-600 hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {isSubmitting ? 'Processing Upload...' : 'Publish Track'}
                </button>
            </form>
        </div>
    );
};