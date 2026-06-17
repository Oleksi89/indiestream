import {useCuratorAnalytics} from '@/features/analytics/hooks/useAnalytics';
import {useAnalyticsTimeRange} from '@/features/analytics/hooks/useAnalyticsTimeRange';
import {SummaryMetricCard} from '@/features/analytics/ui/SummaryMetricCard';
import {TimeRangeSelector} from '@/features/analytics/ui/TimeRangeSelector';
import {MetricCardSkeleton} from '@/features/analytics/ui/AnalyticsSkeletons';
import {useTranslation} from '@/shared/lib/i18n/useTranslation';
import type {PlaylistDto} from '../types';
import {BarChart2} from 'lucide-react';
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/shared/ui/Dialog.tsx";

interface PlaylistAnalyticsModalProps {
    playlist: PlaylistDto;
    isOpen: boolean;
    onClose: () => void;
}

export const PlaylistAnalyticsModal = ({playlist, isOpen, onClose}: PlaylistAnalyticsModalProps) => {
    const {t} = useTranslation();
    const {preset, setRange, startDate, endDate} = useAnalyticsTimeRange('7D');
    const {data, isLoading} = useCuratorAnalytics(isOpen ? playlist.id : undefined, startDate, endDate);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                className="sm:max-w-[700px] max-h-[90vh] flex flex-col bg-slate-950 border-slate-800 text-white p-0 overflow-hidden">
                <div className="p-6 border-b border-slate-800 shrink-0">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <BarChart2 className="text-violet-400" aria-hidden="true"/>
                            {t.playlist.analytics.title.replace('{name}', playlist.name)}
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            {t.playlist.analytics.subtitle}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="flex flex-col gap-6 p-6 overflow-y-auto custom-scrollbar flex-1">
                    <div className="flex justify-end">
                        <TimeRangeSelector
                            value={preset}
                            onChange={setRange}
                            startDate={startDate}
                            endDate={endDate}
                        />
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
                                <SummaryMetricCard title={t.playlist.analytics.totalPlays} value={data.summary.totalPlays}
                                                   growthPercentage={data.summary.playsGrowthPercentage}/>
                                <SummaryMetricCard title={t.playlist.analytics.uniqueListeners} value={data.summary.uniqueListeners}
                                                   growthPercentage={data.summary.listenersGrowthPercentage}/>
                                <SummaryMetricCard title={t.playlist.analytics.saves} value={data.summary.totalLikes}
                                                   growthPercentage={data.summary.likesGrowthPercentage}/>
                                <SummaryMetricCard title={t.playlist.analytics.engagementScore}
                                                   value={data.summary.totalPlays > 0 ? (data.summary.uniqueListeners / data.summary.totalPlays) * 100 : 0}
                                                   format="percent"/>
                            </>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};