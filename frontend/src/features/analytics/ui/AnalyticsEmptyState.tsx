import {BarChart3} from 'lucide-react';
import {cn} from '@/shared/lib/utils.ts';
import {useTranslation} from '@/shared/lib/i18n/useTranslation.ts';

interface AnalyticsEmptyStateProps {
    title?: string;
    message?: string;
    className?: string;
    minHeight?: string;
}

export const AnalyticsEmptyState = (
    {
        title,
        message,
        className,
        minHeight = "min-h-[250px]"
    }: AnalyticsEmptyStateProps) => {
    const {t} = useTranslation();
    const resolvedTitle = title ?? t.analytics.emptyState.defaultTitle;
    const resolvedMessage = message ?? t.analytics.emptyState.defaultMessage;

    return (
        <div
            className={cn("flex flex-col items-center justify-center p-8 text-center bg-slate-900/20 border border-dashed border-slate-800 rounded-xl", minHeight, className)}>
            <div className="h-12 w-12 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
                <BarChart3 className="text-slate-500" size={24} aria-hidden="true"/>
            </div>
            <h3 className="text-sm font-semibold text-slate-300 mb-1">{resolvedTitle}</h3>
            <p className="text-xs text-slate-500 max-w-[250px]">{resolvedMessage}</p>
        </div>
    );
};