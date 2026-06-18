import {useArtistOverview} from '../hooks/useAnalytics.ts';
import {SummaryMetricCard} from './SummaryMetricCard.tsx';
import {MetricCardSkeleton} from './AnalyticsSkeletons.tsx';
import {TrendingUp} from 'lucide-react';
import {TrackCover} from "@/shared/ui/TrackCover.tsx";
import {useTranslation} from '@/shared/lib/i18n/useTranslation.ts';

interface GlobalOverviewProps {
    startDate: string;
    endDate: string;
    onSelectTrack: (id: string) => void;
}

export const GlobalOverview = ({startDate, endDate, onSelectTrack}: GlobalOverviewProps) => {
    const {t} = useTranslation();
    const {data, isLoading} = useArtistOverview(startDate, endDate);

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCardSkeleton/><MetricCardSkeleton/><MetricCardSkeleton/>
            </div>
        );
    }
    if (!data) return null;

    return (
        <div className="flex flex-col gap-8 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SummaryMetricCard title={t.analytics.metrics.totalPlays} value={data.summary.totalPlays}
                                   growthPercentage={data.summary.playsGrowthPercentage}/>
                <SummaryMetricCard title={t.analytics.metrics.uniqueListeners} value={data.summary.uniqueListeners}
                                   growthPercentage={data.summary.listenersGrowthPercentage}/>
                <SummaryMetricCard title={t.analytics.metrics.trackSaves} value={data.summary.totalLikes}
                                   growthPercentage={data.summary.likesGrowthPercentage}/>
            </div>

            <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-4">{t.analytics.overview.topTracks}</h3>
                <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 bg-slate-950 uppercase border-b border-slate-800">
                        <tr>
                            <th scope="col" className="px-6 py-4 font-semibold tracking-wider">{t.analytics.overview.columns.track}</th>
                            <th scope="col" className="px-6 py-4 font-semibold text-right tracking-wider">{t.analytics.overview.columns.plays}</th>
                            <th scope="col" className="px-6 py-4 font-semibold text-right tracking-wider">{t.analytics.overview.columns.listeners}</th>
                            <th scope="col" className="px-6 py-4 font-semibold text-right tracking-wider">{t.analytics.overview.columns.skipRate}</th>
                            <th scope="col" className="px-6 py-4 font-semibold text-right tracking-wider">{t.analytics.overview.columns.popularity}</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                        {data.topTracks.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">{t.analytics.emptyState.noData}</td>
                            </tr>
                        ) : (
                            data.topTracks.map((track) => (
                                <tr key={track.trackId} onClick={() => onSelectTrack(track.trackId)}
                                    tabIndex={0}
                                    aria-label={`${t.analytics.overview.openTrackRow}: ${track.title}`}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            onSelectTrack(track.trackId);
                                        }
                                    }}
                                    className="hover:bg-slate-800/40 transition-colors cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-inset">
                                    <td className="px-6 py-3">
                                        <div className="flex items-center gap-3">
                                            <TrackCover trackId={track.trackId} path={track.coverMinioPath}/>
                                            <span
                                                className="font-medium text-slate-200 group-hover:text-violet-400 transition-colors">{track.title}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-right text-slate-300 font-mono">{track.plays.toLocaleString()}</td>
                                    <td className="px-6 py-3 text-right text-slate-300 font-mono">{track.uniqueListeners.toLocaleString()}</td>
                                    <td className="px-6 py-3 text-right text-slate-400 font-mono">{track.skipRate.toFixed(1)}%</td>
                                    <td className="px-6 py-3 text-right">
                                            <span
                                                className="inline-flex items-center justify-end gap-1 text-violet-400 font-mono bg-violet-400/10 border border-violet-500/20 px-2 py-0.5 rounded">
                                                <TrendingUp size={12} aria-hidden="true"/>
                                                {track.popularityScore.toFixed(1)}
                                            </span>
                                    </td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};