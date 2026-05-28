import {useState, useEffect} from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {X, Upload, Image as ImageIcon} from 'lucide-react';
import {useUpdatePlaylist, useUploadPlaylistCover} from '../hooks/usePlaylists';
import {Button} from '@/shared/ui/button';
import {Switch} from '@/shared/ui/switch';
import type {PlaylistDto} from '../types';

const editSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
    description: z.string().max(300, 'Description is too long').optional(),
    isPublic: z.boolean(),
});

type EditFormValues = z.infer<typeof editSchema>;

export const EditPlaylistModal = ({
                                      playlist,
                                      isOpen,
                                      onClose
                                  }: { playlist: PlaylistDto; isOpen: boolean; onClose: () => void }) => {

    const updateMutation = useUpdatePlaylist();
    const uploadCoverMutation = useUploadPlaylistCover();

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const {register, handleSubmit, setValue, watch, formState: {errors, isSubmitting}} = useForm({
        resolver: zodResolver(editSchema),
        defaultValues: {
            name: playlist.name,
            description: playlist.description || '',
            isPublic: playlist.isPublic
        }
    });

    const isPublicValue = watch('isPublic');

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
                        <Dialog.Title className="text-xl font-bold tracking-tight text-white">Edit
                            details</Dialog.Title>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="flex gap-6">
                            {/* File Upload Area */}
                            <div
                                className="relative shrink-0 group w-44 h-44 rounded-xl overflow-hidden bg-slate-800 shadow-inner flex items-center justify-center cursor-pointer border-2 border-transparent hover:border-violet-500 transition-colors">
                                <input
                                    type="file"
                                    accept="image/jpeg, image/png, image/webp"
                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                />
                                {previewUrl ? (
                                    <img src={previewUrl} className="w-full h-full object-cover" alt="Preview"/>
                                ) : playlist.coverMinioPath ? (
                                    // Normally we use secure fetching, but for layout constraints in a fast edit modal,
                                    // rely on the inherited state or a temporary preview icon.
                                    <ImageIcon size={48} className="text-slate-600"/>
                                ) : (
                                    <div className="flex flex-col items-center text-slate-500 gap-2">
                                        <Upload size={32}/>
                                        <span
                                            className="text-xs font-semibold uppercase tracking-wider">Choose Image</span>
                                    </div>
                                )}

                                <div
                                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                    <span className="text-white text-sm font-medium flex items-center gap-2"><Upload
                                        size={16}/> Replace</span>
                                </div>
                            </div>

                            {/* Metadata Inputs */}
                            <div className="flex flex-col gap-4 flex-1">
                                <div>
                                    <input
                                        {...register('name')}
                                        className="w-full bg-slate-800 border-none rounded-lg p-3 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-violet-500 transition-all"
                                        placeholder="Add a name"
                                    />
                                    {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
                                </div>
                                <textarea
                                    {...register('description')}
                                    className="w-full bg-slate-800 border-none rounded-lg p-3 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-violet-500 transition-all resize-none h-24"
                                    placeholder="Add an optional description"
                                />
                            </div>
                        </div>

                        {/* Privacy Toggle */}
                        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50">
                            <div className="space-y-0.5">
                                <label className="text-sm font-medium text-white">Public Playlist</label>
                                <p className="text-xs text-slate-400">Make this playlist visible on your profile.</p>
                            </div>
                            <Switch checked={isPublicValue} onCheckedChange={(c) => setValue('isPublic', c)}/>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}
                                    className="border-slate-700 text-slate-300 hover:text-white">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}
                                    className="bg-white text-black hover:bg-slate-200 px-8">
                                Save
                            </Button>
                        </div>
                    </form>

                    <Dialog.Close asChild>
                        <button
                            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                            <X className="h-4 w-4 text-slate-400 hover:text-white"/>
                            <span className="sr-only">Close</span>
                        </button>
                    </Dialog.Close>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};