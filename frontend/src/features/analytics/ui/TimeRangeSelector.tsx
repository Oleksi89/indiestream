import {cn} from '@/shared/lib/utils.ts';
import type {AnalyticsTimeRange} from '../types';

interface TimeRangeSelectorProps {
    value: AnalyticsTimeRange;
    onChange: (value: AnalyticsTimeRange) => void;
    disabled?: boolean;
}

export const TimeRangeSelector = ({value, onChange, disabled}: TimeRangeSelectorProps) => {
    const options: { label: string; value: AnalyticsTimeRange }[] = [
        {label: 'Last 7 Days', value: 'LAST_7_DAYS'},
        {label: 'Last 30 Days', value: 'LAST_30_DAYS'},
        {label: 'All Time', value: 'ALL_TIME'},
    ];

    return (
        <div className="flex items-center bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-lg p-1">
            {options.map((opt) => (
                <button
                    key={opt.value}
                    disabled={disabled}
                    onClick={() => onChange(opt.value)}
                    className={cn(
                        "px-4 py-1.5 text-xs font-semibold rounded-md transition-all",
                        value === opt.value
                            ? "bg-violet-600 text-white shadow-sm"
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-transparent"
                    )}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
};