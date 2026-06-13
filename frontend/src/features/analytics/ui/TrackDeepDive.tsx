import {Download, Loader2, TrendingUp} from 'lucide-react';
import {useTrackAnalytics, useExportTrackCsv} from '../hooks/useAnalytics.ts';
import {SummaryMetricCard} from './SummaryMetricCard.tsx';
import {TimeSeriesChart} from './TimeSeriesChart.tsx';
import {AttributionChart} from './AttributionChart.tsx';
import {DemographicsBarChart} from './DemographicsBarChart.tsx';
import {MetricCardSkeleton, ChartSkeleton} from './AnalyticsSkeletons.tsx';
import {Button} from '@/shared/ui/button.tsx';
import {TrackCover} from "@/shared/ui/TrackCover.tsx";


interface TrackDeepDiveProps {
    trackId: string;
    startDate: string;
    endDate: string;
}

export const TrackDeepDive = ({trackId, startDate, endDate}: TrackDeepDiveProps) => {
    const {data, isLoading} = useTrackAnalytics(trackId, startDate, endDate);
    const exportMutation = useExportTrackCsv();

    if (isLoading) {
        return (
            <div className="flex flex-col gap-6 animate-in fade-in duration-300">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MetricCardSkeleton/><MetricCardSkeleton/><MetricCardSkeleton/><MetricCardSkeleton/>
                </div>
                <ChartSkeleton height="h-[350px]"/>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            <div
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800 shadow-lg">
                <div className="flex items-center gap-4">
                    <TrackCover trackId={trackId} path={data.coverMinioPath} size="w-14 h-14 rounded-md"/>
                    <div>
                        <h3 className="text-lg font-bold text-white leading-tight">{data.trackTitle}</h3>
                        <div className="flex items-center gap-3 mt-1.5">
                            <span
                                className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                <span className="relative flex h-2 w-2">
                                    <span
                                        className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
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
                <Button
                    variant="outline" size="sm"
                    className="border-slate-700 bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                    onClick={() => exportMutation.mutate({trackId, startDate, endDate})}
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

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <AttributionChart data={data.attribution}/>
                <DemographicsBarChart data={data.demographics}/>
            </div>
        </div>
    );
};