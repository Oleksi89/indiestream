import {useState} from 'react';
import {ArrowLeft, Download, Disc3, Loader2} from 'lucide-react';
import {useArtistOverview, useTrackAnalytics, useExportTrackCsv} from '../hooks/useAnalytics.ts';
import {TimeRangeSelector} from './TimeRangeSelector.tsx';
import {SummaryMetricCard} from './SummaryMetricCard.tsx';
import {TimeSeriesChart} from './TimeSeriesChart.tsx';
import {AttributionChart} from './AttributionChart.tsx';
import {MetricCardSkeleton, ChartSkeleton} from './AnalyticsSkeletons.tsx';
import type {AnalyticsTimeRange} from '../types';
import {Button} from '@/shared/ui/button.tsx';
import {useSecureUrl} from '@/shared/hooks/useSecureUrl.ts';
import {mediaApi} from '@/features/media/api/media.api.ts';
import {DemographicsBarChart} from "@/features/analytics/ui/DemographicsBarChart.tsx";

export const ArtistAnalyticsDashboard = () => {
    const [timeRange, setTimeRange] = useState<AnalyticsTimeRange>('LAST_7_DAYS');
    const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    {selectedTrackId && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedTrackId(null)}
                            className="rounded-full bg-slate-800 text-slate-300 hover:text-white"
                        >
                            <ArrowLeft size={18}/>
                        </Button>
                    )}
                    <h2 className="text-xl font-bold text-white">
                        {selectedTrackId ? 'Track Performance' : 'Global Performance'}
                    </h2>
                </div>

                <TimeRangeSelector value={timeRange} onChange={setTimeRange}/>
            </div>

            {selectedTrackId ? (
                <TrackDeepDive trackId={selectedTrackId} timeRange={timeRange}/>
            ) : (
                <GlobalOverview timeRange={timeRange} onSelectTrack={setSelectedTrackId}/>
            )}
        </div>
    );
};

// --- GLOBAL OVERVIEW VIEW ---
const GlobalOverview = ({timeRange, onSelectTrack}: {
    timeRange: AnalyticsTimeRange,
    onSelectTrack: (id: string) => void
}) => {
    const {data, isLoading} = useArtistOverview(timeRange);

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCardSkeleton/>
                <MetricCardSkeleton/>
                <MetricCardSkeleton/>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="flex flex-col gap-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SummaryMetricCard
                    title="Total Plays"
                    value={data.summary.totalPlays}
                    growthPercentage={data.summary.playsGrowthPercentage}
                />
                <SummaryMetricCard
                    title="Unique Listeners"
                    value={data.summary.uniqueListeners}
                    growthPercentage={data.summary.listenersGrowthPercentage}
                />
                <SummaryMetricCard
                    title="Track Saves (Likes)"
                    value={data.summary.totalLikes}
                    growthPercentage={data.summary.likesGrowthPercentage}
                />
            </div>

            <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-4">Top Performing Tracks</h3>
                <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 bg-slate-900/80 uppercase">
                        <tr>
                            <th className="px-6 py-4 font-semibold">Track</th>
                            <th className="px-6 py-4 font-semibold text-right">Plays</th>
                            <th className="px-6 py-4 font-semibold text-right">Listeners</th>
                            <th className="px-6 py-4 font-semibold text-right">Skip Rate</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                        {data.topTracks.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">No data available for
                                    this period.
                                </td>
                            </tr>
                        ) : (
                            data.topTracks.map((track) => (
                                <tr
                                    key={track.trackId}
                                    onClick={() => onSelectTrack(track.trackId)}
                                    className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                                >
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

// --- TRACK DEEP DIVE VIEW ---
const TrackDeepDive = ({trackId, timeRange}: { trackId: string, timeRange: AnalyticsTimeRange }) => {
    const {data, isLoading} = useTrackAnalytics(trackId, timeRange);
    const exportMutation = useExportTrackCsv();

    if (isLoading) {
        return (
            <div className="flex flex-col gap-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MetricCardSkeleton/><MetricCardSkeleton/><MetricCardSkeleton/><MetricCardSkeleton/>
                </div>
                <ChartSkeleton height="h-[350px]"/>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                        <span
                            className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                        {data.currentConcurrentListeners} Listening Now
                    </span>
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-700 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800"
                    onClick={() => exportMutation.mutate({trackId, timeRange})}
                    disabled={exportMutation.isPending}
                >
                    {exportMutation.isPending ? <Loader2 size={16} className="animate-spin mr-2"/> :
                        <Download size={16} className="mr-2"/>}
                    Export CSV
                </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SummaryMetricCard title="Total Plays" value={data.summary.totalPlays}
                                   growthPercentage={data.summary.playsGrowthPercentage}/>
                <SummaryMetricCard title="Listeners" value={data.summary.uniqueListeners}
                                   growthPercentage={data.summary.listenersGrowthPercentage}/>
                <SummaryMetricCard title="Completion Rate" value={data.engagement.completionRatePercentage}
                                   format="percent"/>
                <SummaryMetricCard title="Skip Rate" value={data.engagement.skipRatePercentage} format="percent"/>
            </div>

            <TimeSeriesChart data={data.timeSeries}/>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AttributionChart data={data.attribution}/>
                {/* FIXED: Replaced placeholder with actual Demographics Chart */}
                <DemographicsBarChart data={data.demographics}/>
            </div>
        </div>
    );
};

// --- Micro-Component for Table ---
const TrackCover = ({trackId, path}: { trackId: string, path: string | null }) => {
    const {url} = useSecureUrl(`cover-micro-${trackId}`, () => mediaApi.getTrackCoverBlob(trackId), !!path);
    return (
        <div className="h-8 w-8 rounded overflow-hidden bg-slate-800 flex items-center justify-center shrink-0">
            {url ? <img src={url} alt="cover" className="w-full h-full object-cover"/> :
                <Disc3 size={14} className="text-slate-600"/>}
        </div>
    );
};