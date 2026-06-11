import {useState} from 'react';
import {TrackTable} from '@/features/media/sub-features/studio/ui/TrackTable.tsx';
import {useAuthStore} from '@/shared/store/authStore';
import {UploadWizardModal} from '@/features/media/sub-features/upload/ui/UploadWizardModal.tsx';
import {RefreshCw, BarChart2, Library} from 'lucide-react';
import {useQueryClient} from '@tanstack/react-query';
import {trackKeys, useStudioTracks} from '@/features/media/hooks/useTrackQueries';
import {cn} from '@/shared/lib/utils';
import {ArtistAnalyticsDashboard} from "@/features/analytics/ui/ArtistAnalyticsDashboard.tsx";

export const ArtistDashboardPage = () => {
    const user = useAuthStore((state) => state.user);
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'catalog' | 'analytics'>('catalog');

    // Subscribe to fetching state to animate the refresh button
    const {isFetching} = useStudioTracks();

    const handleRefresh = () => {
        // Invalidating cache forces an immediate background fetch
        queryClient.invalidateQueries({queryKey: trackKeys.studio()});
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl pb-24">
            <div
                className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Artist Studio</h1>
                    <p className="text-slate-400 mt-2">
                        Welcome back, <span className="text-violet-400 font-medium">{user?.alias || 'Artist'}</span>.
                        Manage your catalog and monitor your performance.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <UploadWizardModal/>
                </div>
            </div>

            {/* Studio Navigation Tabs */}
            <div className="flex items-center gap-6 mb-8 border-b border-slate-800/50 overflow-x-auto custom-scrollbar">
                <button
                    onClick={() => setActiveTab('catalog')}
                    className={cn(
                        "flex items-center gap-2 pb-3 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap",
                        activeTab === 'catalog'
                            ? "border-violet-500 text-white"
                            : "border-transparent text-slate-500 hover:text-slate-300"
                    )}
                >
                    <Library size={18}/>
                    My Catalog
                </button>
                <button
                    onClick={() => setActiveTab('analytics')}
                    className={cn(
                        "flex items-center gap-2 pb-3 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap",
                        activeTab === 'analytics'
                            ? "border-emerald-500 text-white"
                            : "border-transparent text-slate-500 hover:text-slate-300"
                    )}
                >
                    <BarChart2 size={18}/>
                    Audience & Analytics
                </button>
            </div>

            {/* Tab Content */}
            <div className="flex flex-col gap-8">
                {activeTab === 'catalog' ? (
                    <div className="animate-in fade-in duration-300">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-slate-200">Track Registry</h2>
                            <button
                                onClick={handleRefresh}
                                disabled={isFetching}
                                className="p-2.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors disabled:opacity-50"
                                title="Refresh Statuses"
                            >
                                <RefreshCw size={16}
                                           className={cn("transition-transform", isFetching && "animate-spin")}/>
                            </button>
                        </div>
                        <TrackTable/>
                    </div>
                ) : (
                    <ArtistAnalyticsDashboard/>
                )}
            </div>
        </div>
    );
};