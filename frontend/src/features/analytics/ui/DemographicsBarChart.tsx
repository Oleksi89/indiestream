import {BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell} from 'recharts';
import type {RegionStatDto} from '../types';
import {AnalyticsEmptyState} from './AnalyticsEmptyState.tsx';

interface DemographicsBarChartProps {
    data: RegionStatDto[];
}

export const DemographicsBarChart = ({data}: DemographicsBarChartProps) => {
    if (!data || data.length === 0) {
        return <AnalyticsEmptyState title="No location data"/>;
    }

    return (
        <div className="w-full bg-slate-900/30 border border-slate-800 rounded-xl p-6 h-[350px]">
            <h3 className="text-sm font-semibold text-slate-300 mb-6">Top Regions (Listeners)</h3>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="vertical" margin={{top: 0, right: 20, left: 0, bottom: 0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} opacity={0.5}/>
                    <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false}/>
                    <YAxis
                        dataKey="countryOrCity"
                        type="category"
                        stroke="#94a3b8"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        width={60}
                    />
                    <Tooltip
                        cursor={{fill: '#1e293b', opacity: 0.4}}
                        contentStyle={{backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px'}}
                        itemStyle={{fontSize: '12px', color: '#fff'}}
                    />
                    <Bar dataKey="listeners" name="Listeners" radius={[0, 4, 4, 0]} barSize={20}>
                        {data.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#8b5cf6' : '#475569'}/>
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};