import {BarChart3} from 'lucide-react';
import {cn} from '@/shared/lib/utils.ts';

interface AnalyticsEmptyStateProps {
    title?: string;
    message?: string;
    className?: string;
    minHeight?: string;
}

export const AnalyticsEmptyState = (
    {
        title = "Not enough data yet",
        message = "Check back after your track gets a few more plays.",
        className,
        minHeight = "min-h-[250px]"
    }: AnalyticsEmptyStateProps) => (
    <div
        className={cn("flex flex-col items-center justify-center p-8 text-center bg-slate-900/20 border border-dashed border-slate-800 rounded-xl", minHeight, className)}>
        <div className="h-12 w-12 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
            <BarChart3 className="text-slate-500" size={24}/>
        </div>
        <h3 className="text-sm font-semibold text-slate-300 mb-1">{title}</h3>
        <p className="text-xs text-slate-500 max-w-[250px]">{message}</p>
    </div>
);