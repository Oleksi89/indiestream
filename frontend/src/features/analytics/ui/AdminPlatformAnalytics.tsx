import {useState} from 'react';
import {Activity} from 'lucide-react';
import {usePlatformAnalytics} from '../hooks/useAnalytics.ts';
import {SummaryMetricCard} from './SummaryMetricCard.tsx';
import {TimeRangeSelector} from './TimeRangeSelector.tsx';
import {MetricCardSkeleton} from './AnalyticsSkeletons.tsx';
import type {AnalyticsTimeRange} from '../types';

export const AdminPlatformAnalytics = () => {
    const [timeRange, setTimeRange] = useState<AnalyticsTimeRange>('LAST_7_DAYS');
    const {data, isLoading} = usePlatformAnalytics(timeRange);

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
                <TimeRangeSelector value={timeRange} onChange={setTimeRange}/>
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
                        <SummaryMetricCard
                            title="Total System Plays"
                            value={data.totalPlays}
                            growthPercentage={data.playsGrowthPercentage}
                        />
                        <SummaryMetricCard
                            title="Unique Listeners"
                            value={data.uniqueListeners}
                            growthPercentage={data.listenersGrowthPercentage}
                        />
                        <SummaryMetricCard
                            title="Total Skips"
                            value={data.totalPlays > 0 ? (data.uniqueListeners / data.totalPlays) * 100 : 0}
                            format="percent"
                            growthPercentage={data.playsGrowthPercentage} // Used as proxy for general load
                        />
                        <SummaryMetricCard
                            title="Global Likes"
                            value={data.totalLikes}
                            growthPercentage={data.likesGrowthPercentage}
                        />
                    </>
                )}
            </div>
        </div>
    );
};