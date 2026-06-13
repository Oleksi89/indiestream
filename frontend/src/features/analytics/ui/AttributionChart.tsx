import {PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend} from 'recharts';
import type {AttributionMetricDto} from '../types';
import {AnalyticsEmptyState} from './AnalyticsEmptyState.tsx';

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#64748b'];

interface AttributionChartProps {
    data: AttributionMetricDto[];
}

export const AttributionChart = ({data}: AttributionChartProps) => {
    if (!data || data.length === 0) {
        return <AnalyticsEmptyState title="No attribution data"/>;
    }

    const chartData = data.map(d => ({
        name: d.sourceType.replace(/_/g, ' '),
        value: d.count
    }));

    return (
        <div className="w-full bg-slate-900/30 border border-slate-800 rounded-xl p-6 h-[350px] flex flex-col">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Traffic Sources</h3>
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                        >
                            {chartData.map((_entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]}/>
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px'}}
                            itemStyle={{fontSize: '12px', color: '#fff'}}
                        />
                        <Legend
                            verticalAlign="bottom"
                            height={36}
                            iconType="circle"
                            wrapperStyle={{fontSize: '11px', color: '#cbd5e1'}}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};