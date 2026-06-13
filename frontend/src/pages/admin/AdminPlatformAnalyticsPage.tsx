import {LayoutDashboard} from 'lucide-react';
import {AdminPlatformAnalytics} from "@/features/analytics/ui/AdminPlatformAnalytics.tsx";

export const AdminPlatformAnalyticsPage = () => {
    return (
        <div className="max-w-[1600px] mx-auto p-6 space-y-6 animate-in fade-in duration-500">
            {/* Page Header */}
            <div className="flex flex-col gap-1 border-b border-slate-800 pb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-500/10 rounded-lg text-violet-400">
                        <LayoutDashboard size={24}/>
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Platform Telemetry Center</h1>
                </div>
                <p className="text-sm text-slate-400 ml-12">
                    Global performance, engagement aggregates, and system health monitoring.
                </p>
            </div>

            {/* Core Analytics Widget */}
            <div className="pt-2">
                <AdminPlatformAnalytics/>
            </div>

            {/* Future expansion point for User Growth Charts, Revenue, etc. */}
        </div>
    );
};