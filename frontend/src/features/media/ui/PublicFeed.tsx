import {useQuery} from '@tanstack/react-query';
import {mediaApi} from '../api/media.api';
import {usePlayerStore} from '@/shared/store/playerStore';
import {TrackCard} from './TrackCard';
import {TrackContextMenu} from "@/features/media/ui/TrackContextMenu.tsx";
import {useTranslation} from '@/shared/lib/i18n/useTranslation';

export const PublicFeed = () => {
    const {playContext} = usePlayerStore();
    const {t} = useTranslation();

    const {data, isLoading, isError} = useQuery({
        queryKey: ['tracks', 'public'],
        queryFn: () => mediaApi.getPublicTracks(0, 12),
    });

    if (isLoading) {
        return (
            <div
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
                aria-label={t.media.feed.loadingLabel}
                aria-busy="true">
                {/* Skeleton loading state */}
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="aspect-square bg-slate-800/50 rounded-xl animate-pulse"/>
                ))}
            </div>
        );
    }

    if (isError || !data || data.content.length === 0) {
        return (
            <div className="p-8 border border-slate-800 rounded-xl bg-slate-900/50 text-center">
                <p className="text-slate-400">{t.media.feed.noReleases}</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {data.content.map((track, index) => (
                <TrackContextMenu key={track.id} track={track}>
                    <TrackCard
                        track={track}
                        variant="grid"
                        onPlayOverride={() => playContext(data.content, {type: 'PUBLIC_FEED'}, index)}
                    />
                </TrackContextMenu>
            ))}
        </div>
    );
};
