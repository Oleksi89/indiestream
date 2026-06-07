import {ChevronLeft, ChevronRight} from 'lucide-react';

interface PaginationControlsProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (newPage: number) => void;
    isDisabled?: boolean;
}

export const PaginationControls = ({currentPage, totalPages, onPageChange, isDisabled}: PaginationControlsProps) => {
    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900/50 px-6 py-4">
            <span className="text-sm text-slate-400">
                Page <span className="font-medium text-slate-200">{currentPage + 1}</span> of{' '}
                <span className="font-medium text-slate-200">{totalPages}</span>
            </span>
            <div className="flex gap-2">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 0 || isDisabled}
                    className="flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-300 transition-colors hover:bg-slate-700 disabled:opacity-50"
                >
                    <ChevronLeft size={16}/>
                </button>
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages - 1 || isDisabled}
                    className="flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-300 transition-colors hover:bg-slate-700 disabled:opacity-50"
                >
                    <ChevronRight size={16}/>
                </button>
            </div>
        </div>
    );
};