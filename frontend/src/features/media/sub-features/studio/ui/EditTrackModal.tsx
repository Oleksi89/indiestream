import React, {useState, useEffect} from 'react';
import {useForm, Controller} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import * as Dialog from '@radix-ui/react-dialog';
import {X, Image as ImageIcon, UploadCloud, AlertCircle, Save} from 'lucide-react';


import {mediaApi} from '../../../api/media.api';
import {useSecureUrl} from '@/shared/hooks/useSecureUrl';
import {Switch} from '@/shared/ui/switch';
import {cn} from '@/shared/lib/utils';
import toast from 'react-hot-toast';
import {useUpdateTrackDetails} from "@/features/media/hooks/useTrackMutations.ts";
import type {TrackDto} from "@/features/media/types";
import {AVAILABLE_GENRES} from "@/features/media/types";
import type {TrackMetadataFormValues} from "@/features/media/types/track.schema.ts";
import {MEDIA_LIMITS, trackMetadataSchema} from "@/features/media/types/track.schema.ts";


interface EditTrackModalProps {
    track: TrackDto;
    isOpen: boolean;
    onClose: () => void;
}

export const EditTrackModal = ({track, isOpen, onClose}: EditTrackModalProps) => {
    // coverState: undefined (no change), null (user deleted cover), File (user uploaded new)
    const [coverState, setCoverState] = useState<File | null | undefined>(undefined);
    const [isDragging, setIsDragging] = useState(false);
    const [tagInput, setTagInput] = useState('');

    const {mutate: updateTrack, isPending} = useUpdateTrackDetails();

    // Fetch existing cover if present
    const {url: existingCoverUrl} = useSecureUrl(
        `cover-${track.id}`,
        () => mediaApi.getTrackCoverBlob(track.id),
        !!track.coverMinioPath && coverState === undefined
    );

    const {
        register,
        handleSubmit,
        control,
        formState: {errors},
        watch,
        setValue,
        reset
    } = useForm({
        resolver: zodResolver(trackMetadataSchema),
        defaultValues: {
            title: track.title,
            genre: track.genre || '',
            isExplicit: track.isExplicit || false,
            customTags: track.tags?.custom || []
        }
    });

    const customTags = watch('customTags') || [];

    // Security FSM Guard: Prevent modifying Explicit rating if AI already verified it
    const isAiVerified = !['DRAFT', 'PROCESSING', 'AI_ANALYSIS'].includes(track.status);

    // Reset form when modal opens with new track
    useEffect(() => {
        if (isOpen) {
            reset({
                title: track.title,
                genre: track.genre || '',
                isExplicit: track.isExplicit || false,
                customTags: track.tags?.custom || []
            });
            setCoverState(undefined);
            setTagInput('');
        }
    }, [isOpen, track, reset]);

    const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const tag = tagInput.trim().toLowerCase();
            if (!tag) return;
            if (customTags.length >= 10 || !/^[a-z0-9-]+$/.test(tag) || tag.length > 30) return;
            if (customTags.includes(tag)) {
                setTagInput('');
                return;
            }
            setValue('customTags', [...customTags, tag], {shouldValidate: true});
            setTagInput('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        setValue('customTags', customTags.filter(t => t !== tagToRemove), {shouldValidate: true});
    };

    const validateImage = (file: File) => {
        if (!MEDIA_LIMITS.IMAGE_TYPES.includes(file.type as any)) {
            toast.error('Invalid format. Use JPEG, PNG, or WEBP.');
            return false;
        }
        if (file.size > MEDIA_LIMITS.MAX_IMAGE_SIZE) {
            toast.error('Cover image must be less than 5MB.');
            return false;
        }
        return true;
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file && validateImage(file)) setCoverState(file);
    };

    const onSubmit = (data: TrackMetadataFormValues) => {
        updateTrack({
            trackId: track.id,
            payload: {
                title: data.title !== track.title ? data.title : undefined,
                genre: data.genre !== track.genre ? data.genre : undefined,
                isExplicit: data.isExplicit !== track.isExplicit ? data.isExplicit : undefined,
                customTags: data.customTags,
                cover: coverState
            }
        }, {onSuccess: onClose});
    };

    // Determine what to show in the dropzone
    const showNewCoverPreview = coverState instanceof File;
    const showExistingCover = coverState === undefined && existingCoverUrl;

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 animate-in fade-in"/>
                <Dialog.Content
                    className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">

                    <div
                        className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
                        <div>
                            <Dialog.Title className="text-lg font-semibold text-slate-100">Edit Track</Dialog.Title>
                            <Dialog.Description className="text-sm text-slate-400">Update metadata and cover
                                art</Dialog.Description>
                        </div>
                        <Dialog.Close asChild>
                            <button className="text-slate-400 hover:text-white transition-colors"><X size={20}/>
                            </button>
                        </Dialog.Close>
                    </div>

                    <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                        <form id="edit-track-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                            {/* Title & Genre */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Track Title <span
                                        className="text-red-400">*</span></label>
                                    <input
                                        {...register('title')}
                                        type="text"
                                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all"
                                    />
                                    {errors.title &&
                                        <p className="text-red-400 text-xs mt-1.5">{errors.title.message}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Genre</label>
                                    <select
                                        {...register('genre')}
                                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-slate-100 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all appearance-none"
                                    >
                                        <option value="">Select a genre...</option>
                                        {AVAILABLE_GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Cover Dropzone */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Cover Art</label>
                                <div
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        setIsDragging(true);
                                    }}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={handleDrop}
                                    className={cn(
                                        "relative flex flex-col items-center justify-center w-full h-48 px-4 transition-all border-2 border-dashed rounded-xl appearance-none overflow-hidden",
                                        isDragging ? "border-violet-500 bg-violet-500/10" : "border-slate-700 bg-slate-950 hover:bg-slate-800/50 hover:border-slate-600"
                                    )}
                                >
                                    {showNewCoverPreview || showExistingCover ? (
                                        <>
                                            <img
                                                src={showNewCoverPreview ? URL.createObjectURL(coverState as File) : existingCoverUrl!}
                                                alt="Cover"
                                                className="absolute inset-0 w-full h-full object-cover opacity-50 blur-[2px]"
                                            />
                                            <div
                                                className="relative z-10 flex flex-col items-center text-center space-y-2">
                                                <ImageIcon className="text-white drop-shadow-md" size={32}/>
                                                <span className="font-medium text-white text-sm drop-shadow-md">
                                                    {showNewCoverPreview ? (coverState as File).name : 'Current Cover'}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setCoverState(null);
                                                }}
                                                className="absolute z-20 top-3 right-3 p-2 bg-slate-900/80 backdrop-blur rounded-md text-slate-300 hover:text-red-400 hover:bg-red-500/20 transition-colors shadow-lg"
                                            >
                                                <X size={16}/>
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <UploadCloud className="text-slate-400 mb-2" size={32}/>
                                            <p className="text-sm font-medium text-slate-300">Drag & drop new cover</p>
                                            <p className="text-xs text-slate-500 mt-1">JPEG, PNG, WEBP up to 5MB</p>
                                        </>
                                    )}
                                    <input
                                        type="file"
                                        accept=".jpg,.jpeg,.png,.webp"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-0"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file && validateImage(file)) setCoverState(file);
                                            e.target.value = ''; // Reset input
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Tags & Explicit */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium text-slate-300">Custom Tags</label>
                                    <div
                                        className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 focus-within:border-violet-500 focus-within:ring-1 focus-within:ring-violet-500 flex flex-wrap gap-2">
                                        {customTags.map(tag => (
                                            <span key={tag}
                                                  className="flex items-center gap-1 bg-slate-800 text-slate-200 text-xs px-2 py-1 rounded-md">
                                                {tag}
                                                <button type="button" onClick={() => removeTag(tag)}
                                                        className="ml-1 text-slate-500 hover:text-red-400"><X
                                                    size={12}/></button>
                                            </span>
                                        ))}
                                        <input
                                            type="text"
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyDown={handleTagKeyDown}
                                            placeholder="Add tag..."
                                            className="flex-1 min-w-[100px] bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-none px-2 py-1"
                                        />
                                    </div>
                                </div>

                                <div className={cn(
                                    "flex flex-col justify-center p-4 rounded-xl border transition-colors",
                                    isAiVerified ? "border-slate-800 bg-slate-900/50" : "border-slate-700 bg-slate-950"
                                )}>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-slate-200">Explicit Content</p>
                                            <p className="text-xs text-slate-500">Contains profanity/mature themes</p>
                                        </div>
                                        <Controller
                                            name="isExplicit"
                                            control={control}
                                            render={({field}) => (
                                                <Switch checked={field.value ?? false} onCheckedChange={field.onChange}
                                                        disabled={isAiVerified}/>
                                            )}
                                        />
                                    </div>
                                    {isAiVerified && (
                                        <div className="mt-3 flex items-start gap-1.5 text-[11px] text-amber-500/80">
                                            <AlertCircle size={12} className="shrink-0 mt-0.5"/>
                                            <p>This setting is locked because the track has already been verified by the
                                                AI Moderation engine.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </form>
                    </div>

                    <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/50">
                        <button type="button" onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="edit-track-form"
                            disabled={isPending}
                            className="flex items-center gap-2 px-6 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                        >
                            <Save size={16}/> {isPending ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};