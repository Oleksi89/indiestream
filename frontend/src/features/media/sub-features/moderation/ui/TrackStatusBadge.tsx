import {cn} from '@/shared/lib/utils.ts';
import type {TrackStatus} from '../../../types';
import {
    CheckCircle2,
    AlertTriangle,
    Loader2,
    Ban,
    Clock,
    FileEdit,
    XCircle,
    EyeClosedIcon,
    TrashIcon
} from 'lucide-react';
import {useTranslation} from '@/shared/lib/i18n/useTranslation';

interface TrackStatusBadgeProps {
    status: TrackStatus;
    className?: string;
}

export const TrackStatusBadge = ({status, className}: TrackStatusBadgeProps) => {
    const {t} = useTranslation();
    const sb = t.media.statusBadge;

    const config: Record<TrackStatus, { label: string; color: string; icon: React.ReactNode }> = {
        APPROVED: {
            label: sb.approved,
            color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            icon: <CheckCircle2 size={14} aria-hidden="true"/> as React.ReactNode
        },
        READY: {
            label: sb.live,
            color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            icon: <CheckCircle2 size={14} aria-hidden="true"/> as React.ReactNode
        },
        PUBLISHED: {
            label: sb.published,
            color: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
            icon: <CheckCircle2 size={14} aria-hidden="true"/> as React.ReactNode
        },

        NEEDS_REVISION: {
            label: sb.needsRevision,
            color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            icon: <AlertTriangle size={14} aria-hidden="true"/> as React.ReactNode
        },
        IN_REVIEW: {
            label: sb.inReview,
            color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            icon: <Clock size={14} aria-hidden="true"/> as React.ReactNode
        },

        PROCESSING: {
            label: sb.processing,
            color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            icon: <Loader2 size={14} className="animate-spin" aria-hidden="true"/> as React.ReactNode
        },
        AI_ANALYSIS: {
            label: sb.aiAnalysis,
            color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
            icon: <Loader2 size={14} className="animate-spin" aria-hidden="true"/> as React.ReactNode
        },

        BANNED: {
            label: sb.banned,
            color: 'bg-red-500/10 text-red-400 border-red-500/20',
            icon: <Ban size={14} aria-hidden="true"/> as React.ReactNode
        },
        REJECTED: {
            label: sb.rejected,
            color: 'bg-red-500/10 text-red-400 border-red-500/20',
            icon: <XCircle size={14} aria-hidden="true"/> as React.ReactNode
        },
        FAILED: {
            label: sb.failed,
            color: 'bg-red-500/10 text-red-400 border-red-500/20',
            icon: <XCircle size={14} aria-hidden="true"/> as React.ReactNode
        },

        HIDDEN: {
            label: sb.hidden,
            color: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
            icon: <EyeClosedIcon size={14} aria-hidden="true"/> as React.ReactNode
        },

        ARCHIVED: {
            label: sb.archived,
            color: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
            icon: <TrashIcon size={14} aria-hidden="true"/> as React.ReactNode
        },

        DRAFT: {
            label: sb.draft,
            color: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
            icon: <FileEdit size={14} aria-hidden="true"/> as React.ReactNode
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
