import {useEffect} from 'react';
import {useAuthStore} from '@/shared/store/authStore';
import {PublicFeed} from '@/features/media/ui/PublicFeed';
import {TrackCard} from '@/features/media/ui/TrackCard';
import {CarouselShelf} from '@/features/recommendations/ui/CarouselShelf';
import {CarouselShelfSkeleton} from '@/features/recommendations/ui/CarouselShelfSkeleton';
import {useDiscoveryShelves} from '@/features/recommendations/hooks/useRecommendationQueries';
import {Disc3} from 'lucide-react';
import {Link, useNavigate} from 'react-router-dom';

export const DashboardPage = () => {
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const needsCalibration = user?.profile?.needsTasteCalibration === true;

    // Don't waste DB calls if they need onboarding.
    const {data: shelves, isLoading} = useDiscoveryShelves(!needsCalibration);

    // --- ROUTER GUARD ---
    useEffect(() => {
        if (needsCalibration) {
            navigate('/onboarding', {replace: true});
        }
    }, [needsCalibration, navigate]);

    // Render nothing while redirecting to prevent flash
    if (needsCalibration) return null;

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
            ) : shelves ? (
                <div className="flex flex-col gap-4">
                    <CarouselShelf
                        title="Made For You"
                        items={shelves.madeForYou}
                        keyExtractor={(t) => t.id}
                        renderItem={(track) => <TrackCard track={track as any} variant="grid"/>}
                    />

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
                        renderItem={(track) => <TrackCard track={track} variant="grid"/>}
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