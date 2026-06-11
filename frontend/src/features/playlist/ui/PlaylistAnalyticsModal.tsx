
import {useState} from 'react';
import {useCuratorAnalytics} from '@/features/analytics/hooks/useAnalytics';
import {SummaryMetricCard} from '@/features/analytics/ui/SummaryMetricCard';
import {TimeRangeSelector} from '@/features/analytics/ui/TimeRangeSelector';
import {MetricCardSkeleton} from '@/features/analytics/ui/AnalyticsSkeletons';
import type {AnalyticsTimeRange} from 'src/features/analytics/types';
import type {PlaylistDto} from '../types';
import {BarChart2} from 'lucide-react';
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/shared/ui/Dialog.tsx";

interface PlaylistAnalyticsModalProps {
    playlist: PlaylistDto;
    isOpen: boolean;
    onClose: () => void;
}

export const PlaylistAnalyticsModal = ({playlist, isOpen, onClose}: PlaylistAnalyticsModalProps) => {
    const [timeRange, setTimeRange] = useState<AnalyticsTimeRange>('LAST_7_DAYS');
    const {data, isLoading} = useCuratorAnalytics(isOpen ? playlist.id : undefined, timeRange);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[700px] bg-slate-950 border-slate-800 text-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <BarChart2 className="text-violet-400"/>
                        Playlist Analytics: {playlist.name}
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Monitor the performance and audience growth of your curated list.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-6 py-4">
                    <div className="flex justify-end">
                        <TimeRangeSelector value={timeRange} onChange={setTimeRange}/>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                    title="Total Plays"
                                    value={data.totalPlays}
                                    growthPercentage={data.playsGrowthPercentage}
                                />
                                <SummaryMetricCard
                                    title="Unique Listeners"
                                    value={data.uniqueListeners}
                                    growthPercentage={data.listenersGrowthPercentage}
                                />
                                <SummaryMetricCard
                                    title="Saves / Likes"
                                    value={data.totalLikes}
                                    growthPercentage={data.likesGrowthPercentage}
                                />
                                <SummaryMetricCard
                                    title="Engagement Score"
                                    value={data.totalPlays > 0 ? (data.uniqueListeners / data.totalPlays) * 100 : 0}
                                    format="percent"
                                />
                            </>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};