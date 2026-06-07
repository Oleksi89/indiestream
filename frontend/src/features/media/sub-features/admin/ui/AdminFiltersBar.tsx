import {useState, useEffect} from 'react';
import {Search, ListFilter, ArrowUpDown, X} from 'lucide-react';
import type {TrackStatus} from "@/features/media/types";


interface AdminFiltersBarProps {
    currentQuery: string;
    currentStatuses: TrackStatus[];
    currentSort: string;
    onFilterChange: (updates: { query?: string; statuses?: TrackStatus[]; sort?: string }) => void;
    isLoading: boolean;
}

const ALL_FSM_STATUSES: TrackStatus[] = [
    'DRAFT', 'PROCESSING', 'AI_ANALYSIS', 'NEEDS_REVISION', 'IN_REVIEW',
    'APPROVED', 'READY', 'REJECTED', 'BANNED', 'HIDDEN', 'ARCHIVED', 'PUBLISHED', 'FAILED'
];

export const AdminFiltersBar = ({
                                    currentQuery,
                                    currentStatuses,
                                    currentSort,
                                    onFilterChange,
                                    isLoading
                                }: AdminFiltersBarProps) => {
    // Local state for immediate input feedback
    const [localSearch, setLocalSearch] = useState(currentQuery);

    // Debounce logic for the search input (500ms delay)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (localSearch !== currentQuery) {
                onFilterChange({query: localSearch});
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [localSearch, currentQuery, onFilterChange]);

    const handleStatusToggle = (status: TrackStatus) => {
        if (currentStatuses.includes(status)) {
            onFilterChange({statuses: currentStatuses.filter(s => s !== status)});
        } else {
            onFilterChange({statuses: [...currentStatuses, status]});
        }
    };

    const handleClearAllStatuses = () => {
        onFilterChange({statuses: []});
    };

    return (
        <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4 shadow-sm">

            {/* Top Row: Search & Sort */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="relative w-full md:max-w-md">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                    <input
                        type="text"
                        value={localSearch}
                        onChange={(e) => setLocalSearch(e.target.value)}
                        placeholder="Search by title or artist alias..."
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pl-10 pr-10 text-sm text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                    />
                    {localSearch && (
                        <button onClick={() => {
                            setLocalSearch('');
                            onFilterChange({query: ''});
                        }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                            <X size={16}/>
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto">
                    <ArrowUpDown size={16} className="text-slate-500"/>
                    <select
                        value={currentSort}
                        onChange={(e) => onFilterChange({sort: e.target.value})}
                        disabled={isLoading}
                        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300 outline-none focus:border-emerald-500 transition-all cursor-pointer appearance-none pr-8 relative"
                    >
                        <option value="createdAt,desc">Newest Uploads</option>
                        <option value="createdAt,asc">Oldest Uploads</option>
                    </select>
                </div>
            </div>

            {/* Bottom Row: Granular FSM Status Selector */}
            <div className="border-t border-slate-800/60 pt-3">
                <div className="flex items-center justify-between mb-2">
                    <div
                        className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                        <ListFilter size={14}/>
                        <span>Filter By Track Status</span>
                    </div>
                    {currentStatuses.length > 0 && (
                        <button
                            onClick={handleClearAllStatuses}
                            className="text-xs text-slate-500 hover:text-red-400 transition-colors flex items-center gap-1"
                        >
                            Clear Filters ({currentStatuses.length})
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap gap-2">
                    {ALL_FSM_STATUSES.map((status) => {
                        const isSelected = currentStatuses.includes(status);
                        return (
                            <button
                                key={status}
                                onClick={() => handleStatusToggle(status)}
                                disabled={isLoading}
                                className={`rounded-md px-2.5 py-1 text-[11px] font-mono font-medium transition-all border ${
                                    isSelected
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40 shadow-sm'
                                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                                }`}
                            >
                                {status}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};