import React, {useState, useEffect} from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {useForm} from 'react-hook-form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import {X, Upload, Camera} from 'lucide-react';
import {Button} from '@/shared/ui/button';
import {useQueryClient, useMutation} from '@tanstack/react-query';
import {profileApi} from '../api/profile.api';
import type {UserDto} from '@/features/auth/types';
import toast from 'react-hot-toast';
import {useSecureUrl} from '@/shared/hooks/useSecureUrl';

const profileSchema = z.object({
    bio: z.string().max(500, "Bio cannot exceed 500 characters").optional().nullable(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface EditProfileModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    user: UserDto;
}

export const EditProfileModal = ({isOpen, onOpenChange, user}: EditProfileModalProps) => {
    const queryClient = useQueryClient();
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [bannerPreview, setBannerPreview] = useState<string | null>(null);

    const {url: secureAvatarUrl} = useSecureUrl(
        `avatar-modal-${user.username}`,
        () => profileApi.getAvatarBlob(user.username),
        !!user.profile?.avatarPath && isOpen
    );

    const {url: secureBannerUrl} = useSecureUrl(
        `banner-modal-${user.username}`,
        () => profileApi.getBannerBlob(user.username),
        !!user.profile?.bannerPath && isOpen
    );

    useEffect(() => {
        return () => {
            if (avatarPreview) URL.revokeObjectURL(avatarPreview);
            if (bannerPreview) URL.revokeObjectURL(bannerPreview);
        };
    }, [avatarPreview, bannerPreview]);

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setAvatarFile(file);
        if (file) {
            setAvatarPreview(URL.createObjectURL(file));
        } else {
            setAvatarPreview(null);
        }
    };

    const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setBannerFile(file);
        if (file) {
            setBannerPreview(URL.createObjectURL(file));
        } else {
            setBannerPreview(null);
        }
    };

    const {register, handleSubmit, formState: {errors, isSubmitting}} = useForm({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            bio: user.profile?.bio || '',
        },
    });

    const updateProfileMutation = useMutation({
        mutationFn: async (data: ProfileFormData) => {
            if (avatarFile) await profileApi.updateAvatar(avatarFile);
            if (bannerFile) await profileApi.updateBanner(bannerFile);
            await profileApi.updateProfileText({bio: data.bio ?? undefined});
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['profiles', user.username]});
            toast.success('Profile updated successfully');
            onOpenChange(false);
        },
        onError: () => toast.error('Failed to update profile'),
    });

    return (
        <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"/>
                <Dialog.Content
                    className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-xl border border-white/10 bg-slate-900/90 backdrop-blur-md p-0 shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">

                    <div className="flex items-center justify-between border-b border-white/10 p-4">
                        <Dialog.Title className="text-lg font-semibold text-white">Edit Profile</Dialog.Title>
                        <Dialog.Close asChild>
                            <button
                                className="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors">
                                <X size={20}/>
                            </button>
                        </Dialog.Close>
                    </div>

                    <form onSubmit={handleSubmit((d) => updateProfileMutation.mutate(d))} className="p-4 space-y-6">
                        <div
                            className="relative h-32 w-full rounded-lg bg-slate-800 overflow-hidden group border border-dashed border-white/20 hover:border-violet-500/50 transition-colors">
                            {(bannerPreview || user.profile?.bannerPath) ? (
                                <img src={bannerPreview || secureBannerUrl || ''} alt="Banner"
                                     className="h-full w-full object-cover opacity-60"/>
                            ) : (
                                <div
                                    className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                                    <Upload size={24} className="mb-2"/>
                                    <span className="text-xs">Upload Header</span>
                                </div>
                            )}
                            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleBannerChange}
                                   className="absolute inset-0 cursor-pointer opacity-0"/>
                        </div>

                        <div
                            className="relative -mt-16 ml-4 h-24 w-24 rounded-full border-4 border-slate-900 bg-slate-800 overflow-hidden group">
                            {(avatarPreview || user.profile?.avatarPath) ? (
                                <img src={avatarPreview || secureAvatarUrl || ''} alt="Avatar"
                                     className="h-full w-full object-cover"/>
                            ) : (
                                <div className="flex h-full w-full items-center justify-center bg-slate-800">
                                    <Camera size={28} className="text-slate-500"/>
                                </div>
                            )}
                            <div
                                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 cursor-pointer">
                                <Camera size={24} className="text-white"/>
                                <input type="file" accept="image/jpeg,image/png,image/webp"
                                       onChange={handleAvatarChange}
                                       className="absolute inset-0 cursor-pointer opacity-0"/>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Bio</label>
                            <textarea
                                {...register('bio')}
                                rows={4}
                                className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none"
                                placeholder="Tell the community about yourself..."
                            />
                            {errors.bio && <span className="text-xs text-red-400">{errors.bio.message}</span>}
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                            <Dialog.Close asChild>
                                <Button type="button" variant="ghost">Cancel</Button>
                            </Dialog.Close>
                            <Button type="submit" disabled={isSubmitting || updateProfileMutation.isPending}
                                    className="bg-violet-600 hover:bg-violet-500 text-white">
                                {isSubmitting ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};