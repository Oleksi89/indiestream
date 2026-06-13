import {useSearchParams} from 'react-router-dom';
import {useMemo} from 'react';
import {subHours} from "date-fns/subHours";
import {subDays} from "date-fns/subDays";

export type TimeRangePreset = '4H' | '12H' | '24H' | '7D' | '30D' | 'ALL' | 'CUSTOM';

export const useAnalyticsTimeRange = (defaultPreset: TimeRangePreset = '7D') => {
    const [searchParams, setSearchParams] = useSearchParams();

    const preset = (searchParams.get('range') as TimeRangePreset) || defaultPreset;
    const customStart = searchParams.get('start');
    const customEnd = searchParams.get('end');

    const {startDate, endDate} = useMemo(() => {
        if (preset === 'CUSTOM' && customStart && customEnd) {
            return {startDate: customStart, endDate: customEnd};
        }

        const now = new Date();
        let start: Date;

        switch (preset) {
            case '4H':
                start = subHours(now, 4);
                break;
            case '12H':
                start = subHours(now, 12);
                break;
            case '24H':
                start = subHours(now, 24);
                break;
            case '7D':
                start = subDays(now, 7);
                break;
            case '30D':
                start = subDays(now, 30);
                break;
            case 'ALL':
                start = new Date(2024, 0, 1);
                break; // Project epoch
            default:
                start = subDays(now, 7);
        }

        return {
            startDate: start.toISOString(),
            endDate: now.toISOString()
        };
    }, [preset, customStart, customEnd]);

    // Renamed for clarity, supports explicit custom dates
    const setRange = (newPreset: TimeRangePreset, start?: string, end?: string) => {
        setSearchParams(prev => {
            prev.set('range', newPreset);
            if (newPreset === 'CUSTOM' && start && end) {
                prev.set('start', start);
                prev.set('end', end);
            } else {
                prev.delete('start');
                prev.delete('end');
            }
            return prev;
        }, {replace: true});
    };

    return {preset, setRange, startDate, endDate};
};