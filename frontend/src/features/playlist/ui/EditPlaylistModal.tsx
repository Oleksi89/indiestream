import {useState, useEffect, useMemo} from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {X, Upload, Image as ImageIcon} from 'lucide-react';
import {useUpdatePlaylist, useUploadPlaylistCover} from '../hooks/usePlaylists';
import {Button} from '@/shared/ui/button';
import {Switch} from '@/shared/ui/switch';
import {useTranslation} from '@/shared/lib/i18n/useTranslation';
import type {PlaylistDto} from '../types';

type EditFormValues = {
    name: string;
    description?: string;
    isPublic: boolean;
    isCollaborative: boolean;
};

export const EditPlaylistModal = ({
                                      playlist,
                                      isOpen,
                                      onClose
                                  }: { playlist: PlaylistDto; isOpen: boolean; onClose: () => void }) => {

    const {t} = useTranslation();
    const updateMutation = useUpdatePlaylist();
    const uploadCoverMutation = useUploadPlaylistCover();

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const editSchema = useMemo(() => z.object({
        name: z.string().min(1, t.playlist.edit.errors.nameRequired).max(100, t.playlist.edit.errors.nameTooLong),
        description: z.string().max(300, t.playlist.edit.errors.descriptionTooLong).optional(),
        isPublic: z.boolean(),
        isCollaborative: z.boolean(),
    }), [t]);

    const {register, handleSubmit, setValue, watch, formState: {errors, isSubmitting}} = useForm({
        resolver: zodResolver(editSchema),
        defaultValues: {
            name: playlist.name,
            description: playlist.description || '',
            isPublic: playlist.isPublic,
            isCollaborative: playlist.isCollaborative
        }
    });

    const isPublicValue = watch('isPublic');
    const isCollaborativeValue = watch('isCollaborative');

    useEffect(() => {
        if (!selectedFile) {
            setPreviewUrl(null);
            return;
        }

        const url = URL.createObjectURL(selectedFile);
        setPreviewUrl(url);

        return () => URL.revokeObjectURL(url);
    }, [selectedFile]);

    const onSubmit = async (data: EditFormValues) => {
        try {
            await updateMutation.mutateAsync({id: playlist.id, payload: data});

            if (selectedFile) {
                const formData = new FormData();
                formData.append('file', selectedFile);
                await uploadCoverMutation.mutateAsync({id: playlist.id, file: formData});
            }
            onClose();
        } catch (error) {
            console.error('Mutation failure during sequence execution', error);
        }
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"/>
                <Dialog.Content
                    className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 bg-slate-900 p-6 shadow-lg sm:rounded-2xl border border-slate-800">
                    <div className="flex flex-col space-y-1.5 text-center sm:text-left mb-4">
                        <Dialog.Title className="text-xl font-bold tracking-tight text-white">{t.playlist.edit.title}</Dialog.Title>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="flex gap-6">
                            {/* File Upload Area */}
                            <div
                                className="relative shrink-0 group w-44 h-44 rounded-xl overflow-hidden bg-slate-800 shadow-inner flex items-center justify-center cursor-pointer border-2 border-transparent hover:border-violet-500 transition-colors">
                                <input
                                    type="file"
                                    accept="image/jpeg, image/png, image/webp"
                                    aria-label={t.playlist.edit.coverDropzone}
                                    title={t.playlist.edit.coverDropzone}
                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                />
                                {previewUrl ? (
                                    <img src={previewUrl} className="w-full h-full object-cover" alt={t.playlist.edit.preview}/>
                                ) : playlist.coverMinioPath ? (
                                    <ImageIcon size={48} className="text-slate-600" aria-hidden="true"/>
                                ) : (
                                    <div className="flex flex-col items-center text-slate-500 gap-2">
                                        <Upload size={32} aria-hidden="true"/>
                                        <span
                                            className="text-xs font-semibold uppercase tracking-wider">{t.playlist.edit.chooseImage}</span>
                                    </div>
                                )}

                                <div
                                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                    <span className="text-white text-sm font-medium flex items-center gap-2"><Upload
                                        size={16} aria-hidden="true"/> {t.playlist.edit.replace}</span>
                                </div>
                            </div>

                            {/* Metadata Inputs */}
                            <div className="flex flex-col gap-4 flex-1">
                                <div>
                                    <input
                                        {...register('name')}
                                        aria-label={t.playlist.create.nameLabel}
                                        className="w-full bg-slate-800 border-none rounded-lg p-3 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-violet-500 transition-all"
                                        placeholder={t.playlist.edit.namePlaceholder}
                                    />
                                    {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
                                </div>
                                <textarea
                                    {...register('description')}
                                    aria-label={t.playlist.create.descriptionLabel}
                                    className="w-full bg-slate-800 border-none rounded-lg p-3 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-violet-500 transition-all resize-none h-24"
                                    placeholder={t.playlist.edit.descriptionPlaceholder}
                                />
                            </div>
                        </div>

                        {/* Toggles Container */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50">
                                <div className="space-y-0.5">
                                    <label htmlFor="edit-playlist-public" className="text-sm font-medium text-white">{t.playlist.edit.publicTitle}</label>
                                    <p className="text-xs text-slate-400">{t.playlist.edit.publicDescription}</p>
                                </div>
                                <Switch id="edit-playlist-public" aria-label={t.playlist.edit.publicTitle}
                                        checked={isPublicValue} onCheckedChange={(c) => setValue('isPublic', c)}/>
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50">
                                <div className="space-y-0.5">
                                    <label htmlFor="edit-playlist-collaborative" className="text-sm font-medium text-white">{t.playlist.edit.collaborativeTitle}</label>
                                    <p className="text-xs text-slate-400">{t.playlist.edit.collaborativeDescription}</p>
                                </div>
                                <Switch id="edit-playlist-collaborative" aria-label={t.playlist.edit.collaborativeTitle}
                                        checked={isCollaborativeValue}
                                        onCheckedChange={(c) => setValue('isCollaborative', c)}/>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}
                                    className="border-slate-700 text-slate-300 hover:text-white">
                                {t.common.cancel}
                            </Button>
                            <Button type="submit" disabled={isSubmitting}
                                    className="bg-white text-black hover:bg-slate-200 px-8">
                                {t.common.save}
                            </Button>
                        </div>
                    </form>

                    <Dialog.Close asChild>
                        <button aria-label={t.common.close} title={t.common.close}
                            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                            <X className="h-4 w-4 text-slate-400 hover:text-white" aria-hidden="true"/>
                            <span className="sr-only">{t.common.close}</span>
                        </button>
                    </Dialog.Close>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};