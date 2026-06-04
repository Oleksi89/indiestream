import {cn} from '@/shared/lib/utils.ts';
import type {TrackStatus} from '../../../types';
import {CheckCircle2, AlertTriangle, Loader2, Ban, Clock, FileEdit, XCircle} from 'lucide-react';

interface TrackStatusBadgeProps {
    status: TrackStatus;
    className?: string;
}

export const TrackStatusBadge = ({status, className}: TrackStatusBadgeProps) => {
    const config: Record<TrackStatus, { label: string; color: string; icon: React.ReactNode }> = {
        APPROVED: {
            label: 'Approved',
            color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            icon: <CheckCircle2 size={14}/> as React.ReactNode
        },
        READY: {
            label: 'Live',
            color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            icon: <CheckCircle2 size={14}/> as React.ReactNode
        },
        PUBLISHED: {
            label: 'Published',
            color: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
            icon: <CheckCircle2 size={14}/> as React.ReactNode
        },

        NEEDS_REVISION: {
            label: 'Needs Revision',
            color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            icon: <AlertTriangle size={14}/> as React.ReactNode
        },
        IN_REVIEW: {
            label: 'In Review',
            color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            icon: <Clock size={14}/> as React.ReactNode
        },

        PROCESSING: {
            label: 'Processing',
            color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            icon: <Loader2 size={14} className="animate-spin"/> as React.ReactNode
        },
        AI_ANALYSIS: {
            label: 'AI Analysis',
            color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
            icon: <Loader2 size={14} className="animate-spin"/> as React.ReactNode
        },

        BANNED: {
            label: 'Banned',
            color: 'bg-red-500/10 text-red-400 border-red-500/20',
            icon: <Ban size={14}/> as React.ReactNode
        },
        REJECTED: {
            label: 'Rejected',
            color: 'bg-red-500/10 text-red-400 border-red-500/20',
            icon: <XCircle size={14}/> as React.ReactNode
        },
        FAILED: {
            label: 'Failed',
            color: 'bg-red-500/10 text-red-400 border-red-500/20',
            icon: <XCircle size={14}/> as React.ReactNode
        },

        DRAFT: {
            label: 'Draft',
            color: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
            icon: <FileEdit size={14}/> as React.ReactNode
        }
    };

    const activeConfig = config[status] || config.DRAFT;

    return (
        <span className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border",
            activeConfig.color,
            className
        )}>
            {activeConfig.icon}
            {activeConfig.label}
        </span>
    );
};