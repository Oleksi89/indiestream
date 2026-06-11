import {useParams, useNavigate} from 'react-router-dom';
import {useUserProfile, useFollowMutation, useUnfollowMutation} from '@/features/profile/hooks/useProfile';
import {useAuthStore} from '@/shared/store/authStore';
import {EditProfileModal} from '@/features/profile/ui/EditProfileModal';
import {Button} from '@/shared/ui/button';
import {useState} from 'react';
import {User, CalendarDays, Loader2, ImageIcon, Lock, UserX, History} from 'lucide-react';
import {cn} from '@/shared/lib/utils';
import {useSecureUrl} from "@/shared/hooks/useSecureUrl";
import {profileApi} from "@/features/profile/api/profile.api";
import {useQuery} from '@tanstack/react-query';
import {playlistApi} from '@/features/playlist/api/playlist.api';
import {mediaApi} from '@/features/media/api/media.api';
import {LibraryItem} from '@/features/playlist/ui/LibraryItem';
import {TrackCard} from '@/features/media/ui/TrackCard';
import {useListeningHistory} from '@/features/analytics/hooks/useAnalytics';
import {PaginationControls} from '@/shared/ui/PaginationControls';
import type {PlaylistDto} from '@/features/playlist/types';
import {usePlayerStore} from '@/shared/store/playerStore';

type Tab = 'playlists' | 'tracks' | 'followers' | 'following' | 'history';

export const ProfilePage = () => {
    const {username} = useParams<{ username: string }>();
    const navigate = useNavigate();
    const {user: currentUser} = useAuthStore();
    const {playContext} = usePlayerStore();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('playlists');
    const [historyPage, setHistoryPage] = useState(0); // For pagination
    const isOwnProfile = currentUser?.username === username;

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

    // Queries for Content Grids
    const {data: publicPlaylists, isLoading: isPlaylistsLoading} = useQuery({
        queryKey: ['playlists', 'user', profile?.id],
        queryFn: () => playlistApi.getUserPublicPlaylists(profile!.id),
        enabled: !!profile?.id && activeTab === 'playlists' && (!profile.profile?.isPrivate || currentUser?.username === profile.username)
    });

    const {data: artistTracks, isLoading: isTracksLoading} = useQuery({
        queryKey: ['tracks', 'artist', profile?.id],
        queryFn: () => mediaApi.getArtistTracks(profile!.id),
        enabled: !!profile?.id && activeTab === 'tracks' && (!profile.profile?.isPrivate || currentUser?.username === profile.username)
    });

    const {data: followers, isLoading: isFollowersLoading} = useQuery({
        queryKey: ['followers', profile?.username],
        queryFn: () => profileApi.getFollowers(profile!.username),
        enabled: !!profile?.username && activeTab === 'followers' && (!profile.profile?.hideSubscriptions || isOwnProfile)
    });

    const {data: following, isLoading: isFollowingLoading} = useQuery({
        queryKey: ['following', profile?.username],
        queryFn: () => profileApi.getFollowing(profile!.username),
        enabled: !!profile?.username && activeTab === 'following' && (!profile.profile?.hideSubscriptions || isOwnProfile)
    });

    // Fetch Listening History exclusively for the owner
    const {data: historyData, isLoading: isHistoryLoading} = useListeningHistory(historyPage);

    if (isLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-violet-500"/>
            </div>
        );
    }

    if (isError || !profile) {
        return (
            <div
                className="flex flex-col h-[80vh] w-full items-center justify-center text-slate-400 animate-in fade-in">
                <UserX size={64} className="mb-4 text-slate-600 opacity-50"/>
                <h2 className="text-2xl font-bold text-slate-300 mb-2">Profile Unavailable</h2>
                <p className="text-sm text-slate-500">This account doesn't exist or has been suspended.</p>
                <Button variant="outline" className="mt-6 border-slate-700 text-slate-300 hover:bg-slate-800"
                        onClick={() => navigate('/')}>
                    Return Home
                </Button>
            </div>
        );
    }

    const isPrivateAndNotOwner = profile.profile?.isPrivate && !isOwnProfile;

    // Filter tabs dynamically based on privacy settings and ownership
    const tabs = [
        {id: 'playlists', label: 'Playlists', hidden: false},
        {id: 'tracks', label: 'Tracks', hidden: profile.role === 'USER'},
        {id: 'followers', label: 'Followers', hidden: profile.profile?.hideSubscriptions && !isOwnProfile},
        {id: 'following', label: 'Following', hidden: profile.profile?.hideSubscriptions && !isOwnProfile},
        {id: 'history', label: 'Listening History', hidden: !isOwnProfile}, // Only owner sees history
    ].filter(t => !t.hidden);

    const handleFollowToggle = () => {
        if (profile.isFollowedByMe) unfollowMutation.mutate();
        else followMutation.mutate();
    };

    const handlePlayHistory = (startIndex: number) => {
        if (!historyData?.content) return;
        const tracks = historyData.content.map(h => h.track);
        playContext(tracks, {type: 'PROFILE', id: 'listening-history'}, startIndex);
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
                            className="h-32 w-32 shrink-0 overflow-hidden rounded-full border-4 border-black bg-slate-800 md:h-40 md:w-40 shadow-2xl relative">
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
                            <h1 className="text-3xl font-bold tracking-tight text-white md:text-5xl flex items-center gap-3">
                                {profile.alias}
                                {profile.profile?.isPrivate && <Lock size={20} className="text-slate-500"/>}
                            </h1>
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

                <div className="mt-8 flex flex-col gap-8">
                    {/* Stats & Bio */}
                    <div
                        className="flex flex-col gap-6 rounded-xl  backdrop-blur-md p-6 shadow-xl w-full max-w-3xl">
                        {profile.profile?.bio && (
                            <p className="text-sm text-slate-300 leading-relaxed">
                                {profile.profile.bio}
                            </p>
                        )}

                        <div className="flex items-center gap-8">
                            <div className="flex flex-col">
                                <span className="text-xl font-bold text-white">{profile.followersCount || 0}</span>
                                <span className="text-xs text-slate-400 uppercase tracking-wider">Followers</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xl font-bold text-white">{profile.followingCount || 0}</span>
                                <span className="text-xs text-slate-400 uppercase tracking-wider">Following</span>
                            </div>
                            <div className="w-px h-8 bg-white/10 mx-2"/>
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                <CalendarDays size={16}/>
                                <span>Joined {formattedDate}</span>
                            </div>
                        </div>
                    </div>

                    {isPrivateAndNotOwner ? (
                        <div
                            className="flex flex-col items-center justify-center py-20 border border-white/5 bg-white/5 rounded-2xl">
                            <Lock size={48} className="text-slate-600 mb-4"/>
                            <h2 className="text-xl font-bold text-white mb-2">This account is private</h2>
                            <p className="text-slate-400 text-sm">You must be the owner to view this content.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col mt-4">
                            <div
                                className="flex items-center gap-6 border-b border-white/10 mb-6 overflow-x-auto custom-scrollbar pb-[-1px]">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as Tab)}
                                        className={cn(
                                            "pb-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap",
                                            activeTab === tab.id
                                                ? "border-violet-500 text-white"
                                                : "border-transparent text-slate-400 hover:text-slate-200"
                                        )}
                                    >
                                        {tab.id === 'history' &&
                                            <History size={14} className="inline-block mr-1.5 mb-0.5"/>}
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            <div className="min-h-[300px]">
                                {activeTab === 'playlists' && (
                                    <div
                                        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                        {isPlaylistsLoading ? (
                                            <Loader2
                                                className="animate-spin text-violet-500 mx-auto col-span-full my-10 h-8 w-8"/>
                                        ) : publicPlaylists?.content?.length ? (
                                            publicPlaylists.content.map((pl: PlaylistDto) => (
                                                <LibraryItem
                                                    key={pl.id}
                                                    playlist={pl}
                                                    viewMode="expanded"
                                                    onClick={() => navigate(`/playlist/${pl.id}`)}
                                                />
                                            ))
                                        ) : (
                                            <div className="col-span-full text-center text-slate-500 py-10">No public
                                                playlists found.</div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'tracks' && (
                                    <div
                                        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {isTracksLoading ? (
                                            <Loader2
                                                className="animate-spin text-violet-500 mx-auto col-span-full my-10 h-8 w-8"/>
                                        ) : artistTracks?.content?.length ? (
                                            artistTracks.content.map(track => (
                                                <TrackCard key={track.id} track={track} variant="grid"/>
                                            ))
                                        ) : (
                                            <div className="col-span-full text-center text-slate-500 py-10">No tracks
                                                published yet.</div>
                                        )}
                                    </div>
                                )}

                                {/* History Tab */}
                                {activeTab === 'history' && isOwnProfile && (
                                    <div className="flex flex-col gap-1">
                                        {isHistoryLoading ? (
                                            <Loader2 className="animate-spin text-violet-500 mx-auto my-10 h-8 w-8"/>
                                        ) : historyData?.content?.length ? (
                                            <>
                                                {historyData.content.map((historyItem, index) => (
                                                    <TrackCard
                                                        key={`${historyItem.track.id}-${index}`}
                                                        track={historyItem.track}
                                                        variant="list"
                                                        onPlayOverride={() => handlePlayHistory(index)}
                                                    />
                                                ))}
                                                {historyData.totalPages > 1 && (
                                                    <div className="mt-8 flex justify-center">
                                                        <PaginationControls
                                                            currentPage={historyPage}
                                                            totalPages={historyData.totalPages}
                                                            onPageChange={setHistoryPage}
                                                        />
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div
                                                className="text-center flex flex-col items-center gap-2 text-slate-500 py-20">
                                                <History size={48} className="opacity-20"/>
                                                <p>Your listening history is empty.</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'followers' && (
                                    <div className="flex flex-col gap-2">
                                        {isFollowersLoading ? (
                                            <Loader2 className="animate-spin text-violet-500 mx-auto my-10 h-8 w-8"/>
                                        ) : followers?.content?.length ? (
                                            followers.content.map(user => (
                                                <div key={user.id} onClick={() => navigate(`/user/${user.username}`)}
                                                     className="flex items-center gap-4 p-3 rounded-xl border border-transparent hover:border-white/10 bg-slate-900/40 hover:bg-slate-800/60 cursor-pointer transition-all">
                                                    <div
                                                        className="h-12 w-12 rounded-full overflow-hidden bg-slate-800 shrink-0 flex items-center justify-center">
                                                        <User className="text-slate-500 h-6 w-6"/>
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span
                                                            className="text-sm font-bold text-white truncate">{user.alias}</span>
                                                        <span
                                                            className="text-xs text-slate-400 truncate">@{user.username}</span>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center text-slate-500 py-10">No followers yet.</div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'following' && (
                                    <div className="flex flex-col gap-2">
                                        {isFollowingLoading ? (
                                            <Loader2 className="animate-spin text-violet-500 mx-auto my-10 h-8 w-8"/>
                                        ) : following?.content?.length ? (
                                            following.content.map(user => (
                                                <div key={user.id} onClick={() => navigate(`/user/${user.username}`)}
                                                     className="flex items-center gap-4 p-3 rounded-xl border border-transparent hover:border-white/10 bg-slate-900/40 hover:bg-slate-800/60 cursor-pointer transition-all">
                                                    <div
                                                        className="h-12 w-12 rounded-full overflow-hidden bg-slate-800 shrink-0 flex items-center justify-center">
                                                        <User className="text-slate-500 h-6 w-6"/>
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span
                                                            className="text-sm font-bold text-white truncate">{user.alias}</span>
                                                        <span
                                                            className="text-xs text-slate-400 truncate">@{user.username}</span>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center text-slate-500 py-10">Not following anyone
                                                yet.</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {isOwnProfile && (
                <EditProfileModal isOpen={isEditModalOpen} onOpenChange={setIsEditModalOpen} user={profile}/>
            )}
        </div>
    );
};