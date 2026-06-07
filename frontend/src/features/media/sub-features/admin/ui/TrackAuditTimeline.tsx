import {useState} from 'react';
import {
    Bot,
    User,
    ShieldAlert,
    Activity,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import type {TrackAuditLogDto, TrackStatus} from '../../../types';

interface TrackAuditTimelineProps {
    history: TrackAuditLogDto[];
}

const getStatusIcon = (status: TrackStatus) => {
    switch (status) {
        case 'APPROVED':
            return <CheckCircle2 size={16} className="text-emerald-400"/>;
        case 'BANNED':
        case 'REJECTED':
            return <XCircle size={16} className="text-red-400"/>;
        case 'NEEDS_REVISION':
            return <AlertTriangle size={16} className="text-amber-400"/>;
        case 'AI_ANALYSIS':
            return <Bot size={16} className="text-indigo-400"/>;
        case 'IN_REVIEW':
            return <ShieldAlert size={16} className="text-violet-400"/>;
        default:
            return <Activity size={16} className="text-slate-400"/>;
    }
};

const getActorContext = (log: TrackAuditLogDto) => {
    if (!log.actorId) return {label: 'System / AI', icon: <Bot size={12}/>};
    // In a real app, we might cross-reference actorId to see if it's the Artist or Admin
    return {label: 'User / Admin', icon: <User size={12}/>};
};

export const TrackAuditTimeline = ({history}: TrackAuditTimelineProps) => {
    // Keep track of expanded JSON payloads
    const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});

    const toggleLog = (id: string) => {
        setExpandedLogs(prev => ({...prev, [id]: !prev[id]}));
    };

    if (!history.length) {
        return <div className="text-sm text-slate-500 italic p-4">No audit history available.</div>;
    }

    return (
        <div
            className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-800 before:to-transparent">
            {history.map((log) => {
                const actor = getActorContext(log);
                const isExpanded = expandedLogs[log.id];

                return (
                    <div key={log.id}
                         className="relative flex items-start justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        {/* Timeline Node Icon */}
                        <div
                            className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-950 bg-slate-900 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                            {getStatusIcon(log.newStatus)}
                        </div>

                        {/* Content Card */}
                        <div
                            className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-800 bg-slate-900/50 shadow-sm transition-all hover:border-slate-700">
                            <div className="flex items-center justify-between mb-2">
                                <span
                                    className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                    {log.previousStatus || 'UPLOAD'} <ChevronRight className="inline text-slate-600"
                                                                                   size={10}/> {log.newStatus}
                                </span>
                                <time className="text-[10px] text-slate-500 font-mono">
                                    {new Date(log.createdAt).toLocaleString()}
                                </time>
                            </div>

                            <div className="text-sm text-slate-300 mb-3 leading-relaxed">
                                {log.reason || 'State transition executed without specific reasoning.'}
                            </div>

                            <div
                                className="flex items-center justify-between mt-auto pt-3 border-t border-slate-800/50">
                                <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
                                    {actor.icon} {actor.label}
                                </span>

                                {log.aiPayload && (
                                    <button
                                        onClick={() => toggleLog(log.id)}
                                        className="text-[11px] flex items-center gap-1 text-violet-400 hover:text-violet-300 transition-colors"
                                    >
                                        {isExpanded ? 'Hide Payload' : 'View AI Payload'}
                                        {isExpanded ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                                    </button>
                                )}
                            </div>

                            {/* Graceful Degradation for AI Payload */}
                            {log.aiPayload && isExpanded && (
                                <div
                                    className="mt-3 p-3 rounded-lg bg-slate-950 border border-slate-800 overflow-x-auto custom-scrollbar">
                                    <pre className="text-[10px] text-indigo-300 font-mono">
                                        {JSON.stringify(log.aiPayload, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// Simple inline Chevron to avoid extra imports
const ChevronRight = ({size, className}: { size: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m9 18 6-6-6-6"/>
    </svg>
);