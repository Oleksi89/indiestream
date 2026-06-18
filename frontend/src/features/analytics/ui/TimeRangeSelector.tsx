import {useState} from 'react';
import {cn} from '@/shared/lib/utils.ts';
import type {TimeRangePreset} from '../hooks/useAnalyticsTimeRange';
import {Calendar, X} from 'lucide-react';
import {format} from "date-fns/format";
import {useTranslation} from '@/shared/lib/i18n/useTranslation.ts';


interface TimeRangeSelectorProps {
    value: TimeRangePreset;
    onChange: (value: TimeRangePreset, start?: string, end?: string) => void;
    startDate?: string;
    endDate?: string;
    disabled?: boolean;
}

const CUSTOM_RANGE_PANEL_ID = 'analytics-custom-range-panel';

export const TimeRangeSelector = ({value, onChange, startDate, endDate, disabled}: TimeRangeSelectorProps) => {
    const {t} = useTranslation();
    const [isCustomOpen, setIsCustomOpen] = useState(false);
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    const options: { label: string; value: TimeRangePreset }[] = [
        {label: t.analytics.timeRange.presets['4h'], value: '4H'},
        {label: t.analytics.timeRange.presets['12h'], value: '12H'},
        {label: t.analytics.timeRange.presets['24h'], value: '24H'},
        {label: t.analytics.timeRange.presets['7d'], value: '7D'},
        {label: t.analytics.timeRange.presets['30d'], value: '30D'},
        {label: t.analytics.timeRange.presets.all, value: 'ALL'},
    ];

    const handlePresetClick = (val: TimeRangePreset) => {
        setIsCustomOpen(false);
        onChange(val);
    };

    const applyCustomRange = () => {
        if (customStart && customEnd) {
            const startIso = new Date(customStart).toISOString();
            const endIso = new Date(customEnd).toISOString();
            onChange('CUSTOM', startIso, endIso);
            setIsCustomOpen(false);
        }
    };

    // Helper to render the active custom dates
    const getCustomLabel = () => {
        if (value !== 'CUSTOM' || !startDate || !endDate) return t.analytics.timeRange.custom;
        try {
            return `${format(new Date(startDate), 'MMM d, HH:mm')} - ${format(new Date(endDate), 'MMM d, HH:mm')}`;
        } catch {
            return t.analytics.timeRange.custom;
        }
    };

    return (
        <div className="flex flex-col gap-2 relative">
            <div
                className="flex items-center bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-lg p-1 overflow-x-auto custom-scrollbar">
                {options.map((opt) => (
                    <button
                        key={opt.value}
                        type="button"
                        disabled={disabled}
                        onClick={() => handlePresetClick(opt.value)}
                        className={cn(
                            "px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap",
                            value === opt.value && !isCustomOpen
                                ? "bg-violet-600 text-white shadow-sm"
                                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-transparent"
                        )}
                    >
                        {opt.label}
                    </button>
                ))}

                <div className="w-px h-4 bg-slate-700 mx-1"></div>

                <button
                    type="button"
                    onClick={() => setIsCustomOpen(!isCustomOpen)}
                    disabled={disabled}
                    aria-label={t.analytics.timeRange.openCustomRange}
                    aria-haspopup="dialog"
                    aria-expanded={isCustomOpen}
                    aria-controls={CUSTOM_RANGE_PANEL_ID}
                    className={cn(
                        "px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap flex items-center gap-1.5",
                        (isCustomOpen || value === 'CUSTOM')
                            ? "bg-violet-600 text-white shadow-sm"
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    )}
                >
                    <Calendar size={12} aria-hidden="true"/> {getCustomLabel()}
                </button>
            </div>

            {isCustomOpen && (
                <div
                    id={CUSTOM_RANGE_PANEL_ID}
                    role="dialog"
                    aria-label={t.analytics.timeRange.customRange}
                    className="absolute top-full right-0 mt-2 p-4 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 flex flex-col gap-4 min-w-[280px] animate-in slide-in-from-top-2">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-bold text-slate-200">{t.analytics.timeRange.customRange}</span>
                        <button type="button" onClick={() => setIsCustomOpen(false)}
                                aria-label={t.analytics.timeRange.closeCustomRange}
                                className="text-slate-500 hover:text-slate-300">
                            <X size={16} aria-hidden="true"/>
                        </button>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="analytics-custom-range-start"
                               className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">{t.analytics.timeRange.startDateTime}</label>
                        <input id="analytics-custom-range-start" type="datetime-local" value={customStart}
                               onChange={(e) => setCustomStart(e.target.value)}
                               className="bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-md p-2 outline-none focus:border-violet-500 transition-colors"/>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="analytics-custom-range-end"
                               className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">{t.analytics.timeRange.endDateTime}</label>
                        <input id="analytics-custom-range-end" type="datetime-local" value={customEnd}
                               onChange={(e) => setCustomEnd(e.target.value)}
                               className="bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-md p-2 outline-none focus:border-violet-500 transition-colors"/>
                    </div>
                    <button type="button" onClick={applyCustomRange} disabled={!customStart || !customEnd}
                            className="mt-2 w-full bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold py-2.5 rounded-md transition-colors disabled:opacity-50">
                        {t.analytics.timeRange.applyRange}
                    </button>
                </div>
            )}
        </div>
    );
};