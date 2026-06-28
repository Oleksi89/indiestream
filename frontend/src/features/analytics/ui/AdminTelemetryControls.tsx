import {Database, RefreshCw, Layers, DatabaseZap, Loader2, BrainCircuit} from 'lucide-react';
import {
    useForceHourlyRollup,
    useForceDailyRollup,
    useSyncTotals,
    useTriggerSemanticReindex
} from '../hooks/useAnalytics';
import {useAnalyticsTimeRange} from '../hooks/useAnalyticsTimeRange';
import {useTranslation} from '@/shared/lib/i18n/useTranslation';

/**
 * Administrative panel to manually trigger data rollups, state reconciliation,
 * and AI semantic vector background jobs.
 */
export const AdminTelemetryControls = () => {
    const {t} = useTranslation();
    const ctrl = t.analytics.adminControls;
    const {startDate, endDate} = useAnalyticsTimeRange();

    const hourly = useForceHourlyRollup();
    const daily = useForceDailyRollup();
    const sync = useSyncTotals();
    const semantic = useTriggerSemanticReindex();

    const handleHourly = () => hourly.mutate({start: startDate, end: endDate});
    const handleDaily = () => daily.mutate({start: startDate, end: endDate});
    const handleSync = () => sync.mutate();
    const handleSemantic = () => semantic.mutate();

    return (
        <div
            className="flex flex-col gap-6 p-6 rounded-xl border border-slate-800 bg-slate-900/30 shadow-2xl animate-in fade-in">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                    <Database size={24} aria-hidden="true"/>
                </div>
                <div>
                    <h2 className="text-lg font-bold text-white tracking-tight">{ctrl.title}</h2>
                    <p className="text-sm text-slate-400">{ctrl.subtitle}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Hourly Rollup */}
                <div
                    className="flex flex-col justify-between p-5 rounded-lg bg-slate-950 border border-slate-800 space-y-5 shadow-sm">
                    <div>
                        <h3 className="text-base font-semibold text-slate-200 mb-1.5">{ctrl.hourlyTitle}</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">{ctrl.hourlyDesc}</p>
                    </div>
                    <button
                        onClick={handleHourly}
                        disabled={hourly.isPending}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-base font-medium transition-colors disabled:opacity-50"
                    >
                        {hourly.isPending ? <Loader2 size={18} className="animate-spin"/> : <Layers size={18}/>}
                        {ctrl.hourlyBtn}
                    </button>
                </div>

                {/* Daily Rollup */}
                <div
                    className="flex flex-col justify-between p-5 rounded-lg bg-slate-950 border border-slate-800 space-y-5 shadow-sm">
                    <div>
                        <h3 className="text-base font-semibold text-slate-200 mb-1.5">{ctrl.dailyTitle}</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">{ctrl.dailyDesc}</p>
                    </div>
                    <button
                        onClick={handleDaily}
                        disabled={daily.isPending}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-base font-medium transition-colors disabled:opacity-50"
                    >
                        {daily.isPending ? <Loader2 size={18} className="animate-spin"/> : <DatabaseZap size={18}/>}
                        {ctrl.dailyBtn}
                    </button>
                </div>

                {/* Sync Totals */}
                <div
                    className="flex flex-col justify-between p-5 rounded-lg bg-slate-950 border border-slate-800 space-y-5 shadow-sm">
                    <div>
                        <h3 className="text-base font-semibold text-slate-200 mb-1.5">{ctrl.syncTitle}</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">{ctrl.syncDesc}</p>
                    </div>
                    <button
                        onClick={handleSync}
                        disabled={sync.isPending}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-md bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/20 text-base font-medium transition-colors disabled:opacity-50"
                    >
                        {sync.isPending ? <Loader2 size={18} className="animate-spin"/> : <RefreshCw size={18}/>}
                        {ctrl.syncBtn}
                    </button>
                </div>

                {/* Semantic Re-indexing */}
                <div
                    className="flex flex-col justify-between p-5 rounded-lg bg-slate-950 border border-slate-800 space-y-5 shadow-sm">
                    <div>
                        <h3 className="text-base font-semibold text-slate-200 mb-1.5">{ctrl.semanticTitle}</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">{ctrl.semanticDesc}</p>
                    </div>
                    <button
                        onClick={handleSemantic}
                        disabled={semantic.isPending}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-md bg-violet-600/20 hover:bg-violet-600/30 text-violet-400 border border-violet-500/20 text-base font-medium transition-colors disabled:opacity-50"
                    >
                        {semantic.isPending ? <Loader2 size={18} className="animate-spin"/> : <BrainCircuit size={18}/>}
                        {ctrl.semanticBtn}
                    </button>
                </div>
            </div>
        </div>
    );
};