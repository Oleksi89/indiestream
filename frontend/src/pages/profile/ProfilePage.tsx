import {useParams} from 'react-router-dom';
import {useUserProfile, useFollowMutation, useUnfollowMutation} from '@/features/profile/hooks/useProfile';
import {useAuthStore} from '@/shared/store/authStore';
import {EditProfileModal} from '@/features/profile/ui/EditProfileModal';
import {Button} from '@/shared/ui/button';
import {useState} from 'react';
import {User, CalendarDays, Loader2, ImageIcon} from 'lucide-react';
import {cn} from '@/shared/lib/utils';
import {useSecureUrl} from "@/shared/hooks/useSecureUrl.ts";
import {profileApi} from "@/features/profile/api/profile.api.ts";

export const ProfilePage = () => {
    const {username} = useParams<{ username: string }>();
    const {user: currentUser} = useAuthStore();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const {data: profile, isLoading, isError} = useUserProfile(username || '');
    const followMutation = useFollowMutation(username || '');
    const unfollowMutation = useUnfollowMutation(username || '');

    const {url: avatarUrl, isLoading: isAvatarLoading} = useSecureUrl(
        `avatar-${profile?.username || 'idle'}`,
        () => profile?.username ? profileApi.getAvatarBlob(profile.username) : Promise.reject('No profile loaded'),
        !!profile?.profile?.avatarPath && !!profile?.username
    );

    const {url: bannerUrl, isLoading: isBannerLoading} = useSecureUrl(
        `banner-${profile?.username || 'idle'}`,
        () => profile?.username ? profileApi.getBannerBlob(profile.username) : Promise.reject('No profile loaded'),
        !!profile?.profile?.bannerPath && !!profile?.username
    );

    if (isLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-violet-500"/>
            </div>
        );
    }

    if (isError || !profile) {
        return <div className="flex h-full w-full items-center justify-center text-slate-400">Profile not found.</div>;
    }

    const isOwnProfile = currentUser?.username === profile.username;

    const handleFollowToggle = () => {
        if (profile.isFollowedByMe) {
            unfollowMutation.mutate();
        } else {
            followMutation.mutate();
        }
    };

    const formattedDate = new Date(profile.createdAt).toLocaleDateString('en-US', {month: 'long', year: 'numeric'});

    return (
        <div className="relative min-h-full w-full bg-black text-white pb-24 overflow-x-hidden">
            {/* Hero Banner with Gradient Blend */}
            <div className="relative h-64 w-full md:h-80">
                {profile.profile?.bannerPath ? (
                    isBannerLoading ? (
                        <div className="h-full w-full flex items-center justify-center animate-pulse bg-slate-800">
                            <ImageIcon size={48} className="text-slate-600"/>
                        </div>
                    ) : (
                        <img src={bannerUrl || ''} alt="Banner" className="h-full w-full object-cover"/>
                    )
                ) : (
                    <div className="h-full w-full bg-gradient-to-r from-violet-900/40 to-slate-900/80"/>
                )}
                {/* Smooth blend into the dark background */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"/>
            </div>

            {/* Profile Content Container */}
            <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-24">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">

                    {/* Avatar & Identity Info */}
                    <div className="flex items-end gap-6">
                        <div
                            className="h-32 w-32 shrink-0 overflow-hidden rounded-full border-4 border-black bg-slate-800 md:h-40 md:w-40 shadow-2xl">
                            {profile.profile?.avatarPath ? (
                                isAvatarLoading ? (
                                    <div className="h-full w-full flex items-center justify-center animate-pulse">
                                        <User size={48} className="text-slate-600"/>
                                    </div>
                                ) : (
                                    <img src={avatarUrl || ''} alt={profile.alias}
                                         className="h-full w-full object-cover"/>
                                )
                            ) : (
                                <div className="flex h-full items-center justify-center bg-slate-800">
                                    <User size={48} className="text-slate-500"/>
                                </div>
                            )}
                        </div>

                        <div className="mb-2 flex flex-col">
                            <h1 className="text-3xl font-bold tracking-tight text-white md:text-5xl">{profile.alias}</h1>
                            <span className="text-slate-400 mt-1">@{profile.username}</span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 mb-2">
                        {isOwnProfile ? (
                            <Button variant="outline" onClick={() => setIsEditModalOpen(true)}
                                    className="border-white/20 bg-white/5 backdrop-blur-md hover:bg-white/10 hover:text-white transition-all">
                                Edit Profile
                            </Button>
                        ) : (
                            <Button
                                onClick={handleFollowToggle}
                                className={cn(
                                    "min-w-[120px] transition-all",
                                    profile.isFollowedByMe
                                        ? "bg-white/10 text-white border border-white/20 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30"
                                        : "bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                                )}
                            >
                                {profile.isFollowedByMe ? 'Following' : 'Follow'}
                            </Button>
                        )}
                    </div>
                </div>

                {/* Profile Stats & Bio panel (Glassmorphism styling) */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="col-span-1 flex flex-col gap-6">
                        <div
                            className="rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur-md p-6 shadow-xl">
                            <div className="flex gap-6 mb-6">
                                <div className="flex flex-col">
                                    <span className="text-xl font-bold text-white">{profile.followersCount || 0}</span>
                                    <span className="text-xs text-slate-400 uppercase tracking-wider">Followers</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xl font-bold text-white">{profile.followingCount || 0}</span>
                                    <span className="text-xs text-slate-400 uppercase tracking-wider">Following</span>
                                </div>
                            </div>

                            {profile.profile?.bio && (
                                <p className="text-sm text-slate-300 leading-relaxed mb-6">
                                    {profile.profile.bio}
                                </p>
                            )}

                            <div className="flex flex-col gap-3 text-sm text-slate-400">
                                <div className="flex items-center gap-2">
                                    <CalendarDays size={16}/>
                                    <span>Joined {formattedDate}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Placeholder for  Public Library Grid */}
                    <div className="col-span-1 md:col-span-2">
                        <h2 className="text-xl font-bold border-b border-white/10 pb-4 mb-6">Public Library</h2>
                        <div
                            className="flex items-center justify-center h-48 rounded-xl border border-dashed border-white/10 bg-white/5">
                            <span className="text-slate-500 text-sm">No public tracks or playlists yet.</span>
                        </div>
                    </div>
                </div>
            </div>

            {isOwnProfile && (
                <EditProfileModal isOpen={isEditModalOpen} onOpenChange={setIsEditModalOpen} user={profile}/>
            )}
        </div>
    );
};