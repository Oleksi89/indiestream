import {cn} from '@/shared/lib/utils.ts';

export const MetricCardSkeleton = ({className}: { className?: string }) => (
    <div
        aria-hidden="true"
        className={cn("flex flex-col gap-2 p-5 rounded-xl bg-slate-900/40 border border-slate-800 animate-pulse h-[116px]", className)}>
        <div className="h-4 w-24 bg-slate-800 rounded"/>
        <div className="h-8 w-16 bg-slate-800 rounded mt-1"/>
        <div className="h-3 w-32 bg-slate-800 rounded mt-auto"/>
    </div>
);

export const ChartSkeleton = ({className, height = "h-[300px]"}: { className?: string, height?: string }) => (
    <div
        aria-hidden="true"
        className={cn("w-full rounded-xl bg-slate-900/40 border border-slate-800 animate-pulse flex items-center justify-center", height, className)}>
        <div className="flex items-end gap-2 h-1/2 w-3/4 opacity-20">
            <div className="w-1/6 bg-slate-700 h-[40%] rounded-t-sm"/>
            <div className="w-1/6 bg-slate-700 h-[70%] rounded-t-sm"/>
            <div className="w-1/6 bg-slate-700 h-[50%] rounded-t-sm"/>
            <div className="w-1/6 bg-slate-700 h-[90%] rounded-t-sm"/>
            <div className="w-1/6 bg-slate-700 h-[60%] rounded-t-sm"/>
            <div className="w-1/6 bg-slate-700 h-[100%] rounded-t-sm"/>
        </div>
    </div>
);