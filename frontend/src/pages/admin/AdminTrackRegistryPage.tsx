import {useNavigate} from 'react-router-dom';
import {ShieldAlert, Loader2} from 'lucide-react';


import {PaginationControls} from '@/shared/ui/PaginationControls';
import {useAdminFilters} from "@/features/media/sub-features/admin/hooks/useAdminFilters.ts";
import {useGlobalAdminTracks} from "@/features/media/sub-features/admin/hooks/useAdminQueries.ts";
import {AdminTrackTable} from "@/features/media/sub-features/admin/ui/AdminTrackTable.tsx";
import {AdminFiltersBar} from "@/features/media/sub-features/admin/ui/AdminFiltersBar.tsx";

export const AdminTrackRegistryPage = () => {
    const navigate = useNavigate();
    const {filters, setFilters} = useAdminFilters();

    // The query hook automatically triggers when 'filters' (derived from URL) change
    const {data: pageData, isLoading, isFetching, isError} = useGlobalAdminTracks(filters);

    const handleRowClick = (trackId: string) => {
        // Navigation to the dedicated Inspector workspace
        navigate(`/admin/registry/${trackId}`);
    };

    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-red-400">
                <ShieldAlert size={48} className="mb-4 opacity-80"/>
                <h2 className="text-xl font-bold mb-2">Failed to load registry</h2>
                <p className="text-sm text-red-400/80">Please check your connection or try again later.</p>
            </div>
        );
    }

    // Initial strict load
    const isInitialLoading = isLoading && !pageData;

    return (
        <div className="max-w-[1600px] mx-auto p-6 space-y-6 animate-in fade-in duration-500">

            {/* Page Header */}
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                        <ShieldAlert size={24}/>
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Global Track Registry</h1>
                </div>
                <p className="text-sm text-slate-400 ml-12">
                    Advanced moderation workspace and cross-module audit center.
                </p>
            </div>

            {/* Smart Filters Bar */}
            <AdminFiltersBar
                currentQuery={filters.query || ''}
                currentStatuses={filters.statuses || []}
                currentSort={filters.sort || 'createdAt,desc'}
                onFilterChange={setFilters}
                isLoading={isFetching}
            />

            {/* Data Grid & Pagination Wrapper */}
            <div
                className="flex flex-col gap-0 rounded-xl border border-slate-800 bg-slate-900/30 overflow-hidden shadow-2xl">
                {isInitialLoading ? (
                    <div className="flex flex-col items-center justify-center py-32 text-emerald-500">
                        <Loader2 size={40} className="animate-spin mb-4"/>
                        <p className="text-sm font-medium text-slate-400 animate-pulse">Loading global registry
                            data...</p>
                    </div>
                ) : (
                    <>
                        <AdminTrackTable
                            tracks={pageData?.content || []}
                            isLoading={isFetching}
                            onRowClick={handleRowClick}
                        />
                        <PaginationControls
                            currentPage={filters.page}
                            totalPages={pageData?.totalPages || 0}
                            onPageChange={(newPage) => setFilters({page: newPage})}
                            isDisabled={isFetching}
                        />
                    </>
                )}
            </div>
        </div>
    );
};