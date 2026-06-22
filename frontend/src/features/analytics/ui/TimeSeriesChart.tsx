import {useMemo} from 'react';

import {AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer} from 'recharts';
import type {TimeSeriesPointDto} from '../types';
import {AnalyticsEmptyState} from './AnalyticsEmptyState.tsx';
import {useTranslation} from '@/shared/lib/i18n/useTranslation.ts';
import {parseISO} from "date-fns/parseISO";
import {differenceInHours} from "date-fns/differenceInHours";
import {format} from "date-fns/format";

interface TimeSeriesChartProps {
    data: TimeSeriesPointDto[];
    height?: number;
}

export const TimeSeriesChart = ({data, height = 350}: TimeSeriesChartProps) => {
    const {t} = useTranslation();

    // Hours for <= 48h, Days for more
    const isHourly = useMemo(() => {
        if (!data || data.length === 0) return true;
        const firstDate = parseISO(data[0].timestamp);
        const lastDate = parseISO(data[data.length - 1].timestamp);
        return differenceInHours(lastDate, firstDate) <= 48;
    }, [data]);

    const formattedData = useMemo(() => {
        if (!data || data.length === 0) return [];

        return data.map(point => ({
            ...point,
            // Full date + time for hourly, just date for daily
            fullDate: format(parseISO(point.timestamp), isHourly ? 'PPpp' : 'PPP')
        }));
    }, [data, isHourly]);

    if (!formattedData.length) {
        return <AnalyticsEmptyState title={t.analytics.emptyState.noTimelineData} minHeight={`min-h-[${height}px]`}/>;
    }

    return (
        <div className="w-full bg-slate-900/30 border border-slate-800 rounded-xl p-6" style={{height}}>
            <h3 className="text-sm font-semibold text-slate-300 mb-6">{t.analytics.charts.listeningTrends}</h3>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={formattedData} margin={{top: 10, right: 10, left: -20, bottom: 0}}>
                    <defs>
                        <linearGradient id="colorPlays" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorListeners" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.5}/>
                    <XAxis
                        dataKey="timestamp" stroke="#64748b" fontSize={11}
                        tickLine={false} axisLine={false} dy={10}
                        tickFormatter={(value) => format(parseISO(value), isHourly ? 'HH:mm' : 'MMM dd')}
                    />
                    <YAxis
                        stroke="#64748b" fontSize={11} tickLine={false} axisLine={false}
                        tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
                    />
                    <Tooltip
                        labelFormatter={(_, payload) => payload[0]?.payload.fullDate || ''}
                        contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#1e293b',
                            borderRadius: '8px',
                            color: '#f8fafc'
                        }}
                        itemStyle={{fontSize: '12px', fontWeight: 'bold'}}
                        labelStyle={{fontSize: '11px', color: '#94a3b8', marginBottom: '4px'}}
                    />
                    <Area type="monotone" dataKey="plays" name={t.analytics.metrics.totalPlays} stroke="#8b5cf6"
                          strokeWidth={2} fillOpacity={1} fill="url(#colorPlays)"/>
                    <Area type="monotone" dataKey="uniqueListeners" name={t.analytics.metrics.uniqueListeners}
                          stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorListeners)"/>
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};