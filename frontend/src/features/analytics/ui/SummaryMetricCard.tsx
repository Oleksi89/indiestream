import {TrendingUp, TrendingDown, Minus} from 'lucide-react';
import {cn} from '@/shared/lib/utils.ts';
import {useTranslation} from '@/shared/lib/i18n/useTranslation.ts';

interface SummaryMetricCardProps {
    title: string;
    value: number | string;
    growthPercentage?: number;
    format?: 'number' | 'percent' | 'duration';
}

export const SummaryMetricCard = ({title, value, growthPercentage, format = 'number'}: SummaryMetricCardProps) => {
    const {t} = useTranslation();

    const formattedValue = format === 'percent'
        ? `${Number(value).toFixed(1)}%`
        : typeof value === 'number' ? new Intl.NumberFormat('en-US').format(value) : value;

    const isPositive = growthPercentage && growthPercentage > 0;
    const isNegative = growthPercentage && growthPercentage < 0;
    const isNeutral = !growthPercentage || growthPercentage === 0;

    return (
        <div
            className="flex flex-col p-5 rounded-xl bg-slate-900/40 border border-slate-800 shadow-sm hover:bg-slate-900/60 transition-colors">
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase mb-2">{title}</span>
            <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-3xl font-bold text-white tracking-tight">{formattedValue}</span>

                {growthPercentage !== undefined && (
                    <div className={cn(
                        "flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0",
                        isPositive ? "text-emerald-400 bg-emerald-400/10" :
                            isNegative ? "text-rose-400 bg-rose-400/10" :
                                "text-slate-400 bg-slate-800"
                    )}>
                        {isPositive && <TrendingUp size={12} aria-hidden="true"/>}
                        {isNegative && <TrendingDown size={12} aria-hidden="true"/>}
                        {isNeutral && <Minus size={12} aria-hidden="true"/>}
                        <span>{Math.abs(growthPercentage).toFixed(1)}%</span>
                    </div>
                )}
            </div>
            {growthPercentage !== undefined && (
                <span className="text-[10px] text-slate-500 mt-2">{t.analytics.metrics.vsPreviousPeriod}</span>
            )}
        </div>
    );
};