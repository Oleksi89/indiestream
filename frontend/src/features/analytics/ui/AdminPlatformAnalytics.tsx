import {Activity} from 'lucide-react';
import {usePlatformAnalytics} from '../hooks/useAnalytics.ts';
import {useAnalyticsTimeRange} from '../hooks/useAnalyticsTimeRange.ts';
import {SummaryMetricCard} from './SummaryMetricCard.tsx';
import {TimeRangeSelector} from './TimeRangeSelector.tsx';
import {MetricCardSkeleton} from './AnalyticsSkeletons.tsx';

export const AdminPlatformAnalytics = () => {
    const {preset, setRange, startDate, endDate} = useAnalyticsTimeRange('7D');
    const {data, isLoading} = usePlatformAnalytics(startDate, endDate);

    return (
        <div
            className="flex flex-col gap-6 p-6 rounded-xl border border-slate-800 bg-slate-900/30 shadow-2xl mb-8 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-500/10 rounded-lg text-violet-400">
                        <Activity size={24}/>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-tight">Platform Telemetry</h2>
                        <p className="text-xs text-slate-400">Global performance and engagement aggregates.</p>
                    </div>
                </div>
                {/* Properly bound to setRange */}
                <TimeRangeSelector value={preset} onChange={setRange}/>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {isLoading || !data ? (
                    <>
                        <MetricCardSkeleton/>
                        <MetricCardSkeleton/>
                        <MetricCardSkeleton/>
                        <MetricCardSkeleton/>
                    </>
                ) : (
                    <>
                        <SummaryMetricCard title="Total System Plays" value={data.summary.totalPlays}
                                           growthPercentage={data.summary.playsGrowthPercentage}/>
                        <SummaryMetricCard title="Unique Listeners" value={data.summary.uniqueListeners}
                                           growthPercentage={data.summary.listenersGrowthPercentage}/>
                        <SummaryMetricCard title="Global Completion Rate"
                                           value={data.engagement.completionRatePercentage} format="percent"/>
                        <SummaryMetricCard title="Global Likes" value={data.summary.totalLikes}
                                           growthPercentage={data.summary.likesGrowthPercentage}/>
                    </>
                )}
            </div>
        </div>
    );
};