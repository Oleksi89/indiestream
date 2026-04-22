import {useState} from 'react';
import {useForm, type SubmitHandler} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {mediaApi} from '../api/media.api';
import {useAuthStore} from '@/shared/store/authStore';
import {isAxiosError} from 'axios';
import {UploadCloud, FileAudio, Image as ImageIcon, AlertCircle, CheckCircle2} from 'lucide-react';

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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFileError(null);
        setSuccess(false);

        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];

            if (!ACCEPTED_AUDIO_TYPES.includes(file.type)) {
                setFileError("Only MP3, WAV, and FLAC formats are supported.");
                setSelectedFile(null);
                return;
            }

            if (file.size > MAX_FILE_SIZE) {
                setFileError("Audio file size must be less than 50MB.");
                setSelectedFile(null);
                return;
            }

            setSelectedFile(file);
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

    const onSubmit: SubmitHandler<FormValues> = async (data) => {
        if (!selectedFile) {
            setFileError("Please select an audio file to upload.");
            return;
        }

        if (!user?.id) {
            setServerError("Authentication error. Artist ID is missing.");
            return;
        }

        try {
            setServerError(null);
            await mediaApi.uploadTrack(String(user.id), data.title, selectedFile, selectedCover || undefined);
            setSuccess(true);
            reset();
            setSelectedFile(null);
            setSelectedCover(null);

            const fileInput = document.getElementById('audio-upload') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
            const coverInput = document.getElementById('cover-upload') as HTMLInputElement;
            if (coverInput) coverInput.value = '';
        } catch (error: unknown) {
            if (isAxiosError(error)) {
                setServerError(error.response?.data?.detail || 'Failed to upload track.');
            } else {
                setServerError('An unexpected network error occurred.');
            }
        }
    };

    return (
        <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">Upload Master Track</h2>
                <p className="text-slate-400 text-sm mt-1">Upload your uncompressed audio files and cover art.</p>
            </div>

            {success && (
                <div
                    className="mb-6 flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-400">
                    <CheckCircle2 size={20}/>
                    <p className="text-sm font-medium">Track uploaded successfully to storage.</p>
                </div>
            )}

            {serverError && (
                <div
                    className="mb-6 flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-400">
                    <AlertCircle size={20}/>
                    <p className="text-sm font-medium">{serverError}</p>
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                    {/* Audio File Dropzone */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Audio File *</label>
                        <label
                            htmlFor="audio-upload"
                            className={`flex flex-col items-center justify-center w-full h-32 px-4 transition-all border-2 border-dashed rounded-xl appearance-none cursor-pointer hover:border-violet-500/50 hover:bg-slate-800/50 ${
                                selectedFile ? 'border-violet-500 bg-slate-800/30' : 'border-slate-700 bg-slate-950'
                            }`}
                        >
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

                    {/* Cover Art Dropzone */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Cover Art (Optional)</label>
                        <label
                            htmlFor="cover-upload"
                            className={`flex flex-col items-center justify-center w-full h-32 px-4 transition-all border-2 border-dashed rounded-xl appearance-none cursor-pointer hover:border-violet-500/50 hover:bg-slate-800/50 ${
                                selectedCover ? 'border-violet-500 bg-slate-800/30' : 'border-slate-700 bg-slate-950'
                            }`}
                        >
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

                {fileError && <p className="text-red-400 text-xs text-center">{fileError}</p>}

                <button
                    type="submit"
                    disabled={isSubmitting || !selectedFile}
                    className="w-full flex justify-center py-3 px-4 rounded-lg font-semibold text-white bg-violet-600 hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {isSubmitting ? 'Uploading to MinIO...' : 'Upload Track'}
                </button>
            </form>
        </div>
    );
};