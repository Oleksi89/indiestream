import {useParams, useNavigate, useSearchParams} from 'react-router-dom';
import {ArrowLeft, Loader2, ShieldCheck, BarChart2} from 'lucide-react';
import {useQuery} from '@tanstack/react-query';
import {useAdminTrackDetails} from "@/features/media/sub-features/admin/hooks/useAdminQueries.ts";
import {mediaApi} from "@/features/media/api/media.api.ts";
import {TrackStatusBadge} from "@/features/media/sub-features/moderation/ui/TrackStatusBadge.tsx";
import {AdminModerationWorkspace} from "@/features/media/sub-features/admin/ui/AdminModerationWorkspace.tsx";
import {AdminTrackAnalyticsView} from "@/features/analytics/ui/AdminTrackAnalyticsView.tsx";
import {cn} from "@/shared/lib/utils.ts";
import {useTranslation} from '@/shared/lib/i18n/useTranslation';

export const AdminReviewInspectorPage = () => {
    const {id: trackId} = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const {t} = useTranslation();
    const ins = t.media.admin.inspector;

    // Derived URL State
    const activeTab = searchParams.get('tab') || 'review';

    // Core Data Fetching
    const {data: details, isLoading: isDetailsLoading} = useAdminTrackDetails(trackId!);
    const {data: playableTrack, isLoading: isTrackLoading} = useQuery({
        queryKey: ['track', trackId],
        queryFn: () => mediaApi.getTrack(trackId!),
        enabled: !!trackId,
    });

    const handleTabSwitch = (tab: 'review' | 'analytics') => {
        setSearchParams(prev => {
            prev.set('tab', tab);
            return prev;
        }, {replace: true});
    };

    if (isDetailsLoading || isTrackLoading) {
        return (
            <div className="flex h-[80vh] items-center justify-center text-emerald-500">
                <Loader2 size={40} className="animate-spin" aria-label={t.common.loading}/>
            </div>
        );
    }

    if (!details || !playableTrack) return null;

    return (
        <div className="max-w-[1600px] mx-auto p-6 space-y-6 animate-in fade-in duration-500">
            {/* Header & Context */}
            <div className="flex items-center gap-4 border-b border-slate-800 pb-6">
                <button
                    onClick={() => navigate('/admin/registry')}
                    aria-label={ins.backToRegistry}
                    title={ins.backToRegistry}
                    className="p-2 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                    <ArrowLeft size={20} aria-hidden="true"/>
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-white tracking-tight">{ins.pageTitle}</h1>
                    <p className="text-sm text-slate-400 font-mono mt-1">{ins.trackId}: {details.trackId}</p>
                </div>
                <TrackStatusBadge status={details.status}/>
            </div>

            {/* Workspace Tab Navigation */}
            <div className="flex items-center gap-6 border-b border-slate-800/50" role="tablist">
                <button
                    role="tab"
                    aria-selected={activeTab === 'review'}
                    onClick={() => handleTabSwitch('review')}
                    className={cn(
                        "flex items-center gap-2 pb-3 text-sm font-semibold transition-colors border-b-2",
                        activeTab === 'review' ? "border-emerald-500 text-white" : "border-transparent text-slate-500 hover:text-slate-300"
                    )}
                >
                    <ShieldCheck size={18} aria-hidden="true"/>
                    {ins.tabReview}
                </button>
                <button
                    role="tab"
                    aria-selected={activeTab === 'analytics'}
                    onClick={() => handleTabSwitch('analytics')}
                    className={cn(
                        "flex items-center gap-2 pb-3 text-sm font-semibold transition-colors border-b-2",
                        activeTab === 'analytics' ? "border-violet-500 text-white" : "border-transparent text-slate-500 hover:text-slate-300"
                    )}
                >
                    <BarChart2 size={18} aria-hidden="true"/>
                    {ins.tabAnalytics}
                </button>
            </div>

            {/* Dynamic View Injection */}
            <div className="mt-6" role="tabpanel">
                {activeTab === 'review' ? (
                    <AdminModerationWorkspace details={details} playableTrack={playableTrack}/>
                ) : (
                    <AdminTrackAnalyticsView trackId={trackId!}/>
                )}
            </div>
        </div>
    );
};
