import {useEffect} from 'react';
import {useAuthStore} from '@/shared/store/authStore';
import {PublicFeed} from '@/features/media/ui/PublicFeed';
import {TrackCard} from '@/features/media/ui/TrackCard';
import {CarouselShelf} from '@/features/recommendations/ui/CarouselShelf';
import {CarouselShelfSkeleton} from '@/features/recommendations/ui/CarouselShelfSkeleton';
import {useDiscoveryShelves} from '@/features/recommendations/hooks/useRecommendationQueries';
import {useNavigate} from 'react-router-dom';
import {useTranslation} from '@/shared/lib/i18n/useTranslation';
import {TrackContextMenu} from "@/features/media/ui/TrackContextMenu.tsx";
import {LibraryItem} from "@/features/playlist/ui/LibraryItem.tsx";

export const DashboardPage = () => {
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const needsCalibration = user?.profile?.needsTasteCalibration === true;
    const {t} = useTranslation();
    const db = t.dashboard;

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
                    {db.greeting} <span className="text-violet-400">{user?.alias || 'Listener'}</span>
                </h1>
                <p className="text-slate-400 mt-2 text-lg">{db.subtitle}</p>
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
                        title={db.recommendations.madeForYou}
                        items={shelves.madeForYou}
                        keyExtractor={(t) => t.id}
                        renderItem={(track) => <TrackContextMenu key={track.id} track={track}> <TrackCard track={track as any} variant="grid"/></TrackContextMenu>}
                    />

                    <CarouselShelf
                        title={db.recommendations.discoverPlaylists}
                        items={shelves.discoverPlaylists}
                        keyExtractor={(p) => p.id}
                        renderItem={(playlist) => (
                            <LibraryItem
                                key={playlist.id}
                                playlist={playlist}
                                viewMode="expanded"
                                onClick={() => navigate(`/playlist/${playlist.id}`)}
                            />
                        )}
                    />

                    <CarouselShelf
                        title={db.recommendations.listenersLikeYou}
                        items={shelves.listenersLikeYou}
                        keyExtractor={(t) => t.id}
                        renderItem={(track) => <TrackCard track={track} variant="grid"/>}
                    />
                </div>
            ) : null}

            <section>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white tracking-tight">{db.newReleases}</h2>
                    <button className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
                        {db.showAll}
                    </button>
                </div>
                <PublicFeed/>
            </section>
        </div>
    );
};
