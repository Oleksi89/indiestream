import {useAdminTrackAnalytics} from '@/features/media/sub-features/admin/hooks/useAdminQueries.ts';
import {useAnalyticsTimeRange} from '../hooks/useAnalyticsTimeRange.ts';
import {TimeRangeSelector} from './TimeRangeSelector.tsx';
import {SummaryMetricCard} from './SummaryMetricCard.tsx';
import {TimeSeriesChart} from './TimeSeriesChart.tsx';
import {AttributionChart} from './AttributionChart.tsx';
import {DemographicsBarChart} from './DemographicsBarChart.tsx';
import {MetricCardSkeleton, ChartSkeleton} from './AnalyticsSkeletons.tsx';
import {Activity, TrendingUp} from 'lucide-react';
import {TrackCover} from "@/shared/ui/TrackCover.tsx";

interface AdminTrackAnalyticsViewProps {
    trackId: string;
}

export const AdminTrackAnalyticsView = ({trackId}: AdminTrackAnalyticsViewProps) => {
    // Isolated URL state for this view
    const {preset, setRange, startDate, endDate} = useAnalyticsTimeRange('7D');
    const {data, isLoading} = useAdminTrackAnalytics(trackId, startDate, endDate);

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            <div
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800 shadow-sm">
                <div className="flex items-center gap-4">
                    <div
                        className="h-12 w-12 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400 shrink-0">
                        <Activity size={24}/>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white leading-tight">System Telemetry</h3>
                        <p className="text-xs text-slate-400">Unrestricted administrative overview</p>
                    </div>
                </div>
                <TimeRangeSelector value={preset} onChange={setRange}/>
            </div>

            {isLoading || !data ? (
                <div className="flex flex-col gap-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <MetricCardSkeleton/><MetricCardSkeleton/><MetricCardSkeleton/><MetricCardSkeleton/>
                    </div>
                    <ChartSkeleton height="h-[350px]"/>
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    {/* Track Identity Header */}
                    <div className="flex items-center gap-4 bg-slate-900/20 p-4 rounded-xl border border-slate-800">
                        <TrackCover trackId={trackId} path={data.coverMinioPath} size="w-12 h-12 rounded-md"/>
                        <div>
                            <h4 className="font-bold text-slate-200">{data.trackTitle}</h4>
                            <div className="flex items-center gap-3 mt-1.5">
                                <span
                                    className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                    <span className="relative flex h-2 w-2">
                                        <span
                                            className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span
                                            className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                    {data.currentConcurrentListeners} Live
                                </span>
                                <span
                                    className="flex items-center gap-1 text-xs font-semibold text-violet-400 bg-violet-400/10 px-2 py-0.5 rounded-full border border-violet-500/20">
                                    <TrendingUp size={12}/>
                                    Score: {data.popularityScore.toFixed(1)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <SummaryMetricCard title="Total Plays" value={data.summary.totalPlays}
                                           growthPercentage={data.summary.playsGrowthPercentage}/>
                        <SummaryMetricCard title="Listeners" value={data.summary.uniqueListeners}
                                           growthPercentage={data.summary.listenersGrowthPercentage}/>
                        <SummaryMetricCard title="Completion Rate" value={data.engagement.completionRatePercentage}
                                           format="percent"/>
                        <SummaryMetricCard title="Skip Rate" value={data.engagement.skipRatePercentage}
                                           format="percent"/>
                    </div>

                    <TimeSeriesChart data={data.timeSeries}/>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <AttributionChart data={data.attribution}/>
                        <DemographicsBarChart data={data.demographics}/>
                    </div>
                </div>
            )}
        </div>
    );
};