import {LayoutDashboard} from 'lucide-react';
import {AdminPlatformAnalytics} from "@/features/analytics/ui/AdminPlatformAnalytics.tsx";
import {useTranslation} from '@/shared/lib/i18n/useTranslation';
import {AdminTelemetryControls} from "@/features/analytics/ui/AdminTelemetryControls.tsx";

export const AdminPlatformAnalyticsPage = () => {
    const {t} = useTranslation();
    const an = t.media.admin.analytics;

    return (
        <div className="max-w-[1600px] mx-auto p-6 space-y-6 animate-in fade-in duration-500">
            {/* Page Header */}
            <div className="flex flex-col gap-1 border-b border-slate-800 pb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-500/10 rounded-lg text-violet-400">
                        <LayoutDashboard size={24} aria-hidden="true"/>
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">{an.pageTitle}</h1>
                </div>
                <p className="text-sm text-slate-400 ml-12">{an.pageSubtitle}</p>
            </div>

            {/* Core Analytics Widget */}
            <div className="pt-2">
                <AdminPlatformAnalytics/>
            </div>

            {/* Telemetry Control Panel */}
            <AdminTelemetryControls/>
        </div>
    );
};
