import React from 'react';
import {useAuthStore} from '@/shared/store/authStore';
import {PublicFeed} from '@/features/media/ui/PublicFeed';
import {TrackCard} from '@/features/media/ui/TrackCard';
import {CarouselShelf} from '@/features/recommendations/ui/CarouselShelf';
import {CarouselShelfSkeleton} from '@/features/recommendations/ui/CarouselShelfSkeleton';
import {useDiscoveryShelves} from '@/features/recommendations/hooks/useRecommendationQueries';
import {Disc3, ArrowRight} from 'lucide-react';
import {Link} from 'react-router-dom';

export const DashboardPage = () => {
    const user = useAuthStore((state) => state.user);
    const {data: shelves, isLoading, isError, error} = useDiscoveryShelves();

    // Type casting error to check for specific 400 Bad Request status (Cold Start trigger)
    const isColdStart = isError && (error as any)?.response?.status === 400;

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl space-y-12">
            <header className="border-b border-slate-800 pb-6">
                <h1 className="text-4xl font-bold tracking-tight text-white">
                    Good evening, <span className="text-violet-400">{user?.alias || 'Listener'}</span>
                </h1>
                <p className="text-slate-400 mt-2 text-lg">Discover new independent music tailored for you.</p>
            </header>

            {/* AI Recommendations Engine Presentation */}
            {isLoading ? (
                <>
                    <CarouselShelfSkeleton/>
                    <CarouselShelfSkeleton/>
                </>
            ) : isColdStart ? (
                <section
                    className="bg-slate-900/50 border border-violet-500/30 rounded-2xl p-8 flex flex-col items-center text-center space-y-4">
                    <div
                        className="w-16 h-16 bg-violet-500/20 rounded-full flex items-center justify-center text-violet-400 mb-2">
                        <Disc3 size={32}/>
                    </div>
                    <h2 className="text-2xl font-bold text-white">Let's fine-tune your algorithm</h2>
                    <p className="text-slate-400 max-w-md">
                        We need to know what you like before we can generate your personalized feeds.
                    </p>
                    <Link
                        to="/onboarding"
                        className="mt-4 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                        Start Discovery <ArrowRight size={18}/>
                    </Link>
                </section>
            ) : shelves ? (
                <div className="flex flex-col gap-4">
                    <CarouselShelf
                        title="Made For You"
                        items={shelves.madeForYou}
                        keyExtractor={(t) => t.id}
                        renderItem={(track) => <TrackCard track={track as any} variant="grid"/>}
                    />

                    {/* Utilizing standard DOM mapping for Playlists to prevent missing component errors.
                        Refactor to LibraryItem if required. */}
                    <CarouselShelf
                        title="Discover Playlists"
                        items={shelves.discoverPlaylists}
                        keyExtractor={(p) => p.id}
                        renderItem={(playlist) => (
                            <Link to={`/playlist/${playlist.id}`} className="group flex flex-col gap-3">
                                <div
                                    className="aspect-square bg-slate-800 rounded-xl overflow-hidden shadow-lg border border-slate-800 group-hover:border-violet-500/50 transition-colors">
                                    {playlist.coverMinioPath ? (
                                        <img src={playlist.coverMinioPath} alt={playlist.name}
                                             className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                                            <Disc3 size={48}/>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col px-1">
                                    <span
                                        className="text-base font-semibold text-white truncate group-hover:text-violet-400 transition-colors">{playlist.name}</span>
                                    <span className="text-sm text-slate-400 truncate">By {playlist.ownerAlias}</span>
                                </div>
                            </Link>
                        )}
                    />

                    <CarouselShelf
                        title="Listeners Like You"
                        items={shelves.listenersLikeYou}
                        keyExtractor={(t) => t.id}
                        renderItem={(track) => <TrackCard track={track as any} variant="grid"/>}
                    />
                </div>
            ) : null}

            <section>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white">New Releases</h2>
                    <button className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
                        Show all
                    </button>
                </div>
                <PublicFeed/>
            </section>
        </div>
    );
};