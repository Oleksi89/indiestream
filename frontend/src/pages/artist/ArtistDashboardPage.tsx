import {TrackTable} from '@/features/media/ui/TrackTable';
import {useAuthStore} from '@/shared/store/authStore';
import {UploadWizardModal} from '@/features/media/ui/wizard/UploadWizardModal';
import {RefreshCw} from 'lucide-react';
import {useQueryClient} from '@tanstack/react-query';
import {trackKeys, useStudioTracks} from '@/features/media/hooks/useTrackQueries';
import {cn} from '@/shared/lib/utils';

export const ArtistDashboardPage = () => {
    const user = useAuthStore((state) => state.user);
    const queryClient = useQueryClient();

    // Subscribe to fetching state to animate the refresh button
    const {isFetching} = useStudioTracks();

    const handleRefresh = () => {
        // Invalidating cache forces an immediate background fetch
        queryClient.invalidateQueries({queryKey: trackKeys.studio()});
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            <div
                className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Artist Studio</h1>
                    <p className="text-slate-400 mt-2">
                        Welcome back, <span className="text-violet-400 font-medium">{user?.alias || 'Artist'}</span>.
                        Manage your catalog and monitor AI processing.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <UploadWizardModal/>
                </div>
            </div>

            <div className="flex flex-col gap-8">
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-slate-200">Your Catalog</h2>
                        <button
                            onClick={handleRefresh}
                            disabled={isFetching}
                            className="p-2.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors disabled:opacity-50"
                            title="Refresh Statuses"
                        >
                            <RefreshCw
                                size={16}
                                className={cn("transition-transform", isFetching && "animate-spin")}
                            />
                        </button>
                    </div>
                    <TrackTable/>
                </div>
            </div>
        </div>
    );
};