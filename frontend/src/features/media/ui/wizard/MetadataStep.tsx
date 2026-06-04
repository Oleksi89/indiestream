import {useForm, Controller} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {trackMetadataSchema, type TrackMetadataFormValues} from '../../types/track.schema';
import {useUploadWizardStore} from '../../hooks/useUploadWizardStore';
import {AVAILABLE_GENRES} from '../../types';
import {Switch} from '@/shared/ui/switch';
import {Tag, X, ArrowRight} from 'lucide-react';
import React, {useState} from 'react';

export const MetadataStep = () => {
    const {metadata, setMetadata, setStep} = useUploadWizardStore();
    const [tagInput, setTagInput] = useState('');

    const {register, handleSubmit, control, formState: {errors}, watch, setValue} = useForm({
        resolver: zodResolver(trackMetadataSchema),
        defaultValues: metadata,
    });

    const customTags = watch('customTags') || [];

    const onSubmit = (data: TrackMetadataFormValues) => {
        setMetadata(data);
        setStep('MEDIA');
    };

    const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const tag = tagInput.trim().toLowerCase();
            if (!tag) return;

            if (customTags.length >= 10) return;
            if (!/^[a-z0-9-]+$/.test(tag) || tag.length > 30) return;
            if (customTags.includes(tag)) {
                setTagInput('');
                return;
            }

            setValue('customTags', [...customTags, tag], {shouldValidate: true});
            setTagInput('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        setValue('customTags', customTags.filter(tag => tag !== tagToRemove), {shouldValidate: true});
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}
              className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Track Title <span
                    className="text-red-400">*</span></label>
                <input
                    {...register('title')}
                    type="text"
                    autoFocus
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all"
                    placeholder="Enter track title"
                />
                {errors.title && <p className="text-red-400 text-xs mt-1.5">{errors.title.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Primary Genre</label>
                    <select
                        {...register('genre')}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-2.5 text-slate-100 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all appearance-none"
                    >
                        <option value="0">Select a genre...</option>
                        {AVAILABLE_GENRES.map(g => (
                            <option key={g} value={g}>{g}</option>
                        ))}
                    </select>
                    {errors.genre && <p className="text-red-400 text-xs mt-1.5">{errors.genre.message}</p>}
                </div>

                <div
                    className="flex items-center justify-between p-4 rounded-xl border border-slate-700 bg-slate-900/50">
                    <div>
                        <p className="text-sm font-medium text-slate-200">Explicit Content</p>
                        <p className="text-xs text-slate-500">Contains profanity or mature themes</p>
                    </div>
                    <Controller
                        name="isExplicit"
                        control={control}
                        render={({field}) => (
                            <Switch checked={field.value ?? false} onCheckedChange={field.onChange}/>
                        )}
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Custom Tags</label>
                <div
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/50 p-2 focus-within:border-violet-500 focus-within:ring-1 focus-within:ring-violet-500 transition-all flex flex-wrap gap-2">
                    {customTags.map(tag => (
                        <span key={tag}
                              className="flex items-center gap-1 bg-slate-800 text-slate-200 text-xs px-2.5 py-1.5 rounded-md">
                            <Tag size={10} className="text-violet-400"/>
                            {tag}
                            <button type="button" onClick={() => removeTag(tag)}
                                    className="ml-1 text-slate-500 hover:text-red-400 transition-colors">
                                <X size={12}/>
                            </button>
                        </span>
                    ))}
                    <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleTagKeyDown}
                        placeholder={customTags.length < 10 ? "Type tag, press Enter" : "Max 10 tags reached"}
                        disabled={customTags.length >= 10}
                        className="flex-1 min-w-[140px] bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-none px-2 py-1"
                    />
                </div>
                {errors.customTags && <p className="text-red-400 text-xs mt-1.5">{errors.customTags.message}</p>}
                <p className="text-slate-500 text-[11px] mt-1.5">Lowercase, alphanumeric, max 30 chars. These will be
                    merged with AI auto-tags.</p>
            </div>

            <div className="flex justify-end pt-4">
                <button type="submit"
                        className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors">
                    Continue to Media <ArrowRight size={16}/>
                </button>
            </div>
        </form>
    );
};