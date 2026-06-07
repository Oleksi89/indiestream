import React, {useState} from 'react';
import {useParams, useNavigate} from 'react-router-dom';
import {ArrowLeft, Loader2, Gavel, ShieldCheck, ArchiveRestore, Ban, UserX} from 'lucide-react';
import {useQuery} from '@tanstack/react-query';
import {useAdminTrackDetails} from "@/features/media/sub-features/admin/hooks/useAdminQueries.ts";
import type {AdminVerdict} from "@/features/media/types";
import {mediaApi} from "@/features/media/api/media.api.ts";
import {TrackStatusBadge} from "@/features/media/sub-features/moderation/ui/TrackStatusBadge.tsx";
import {TrackCard} from "@/features/media/ui/TrackCard.tsx";
import {TrackAuditTimeline} from "@/features/media/sub-features/admin/ui/TrackAuditTimeline.tsx";
import {AdminActionDialog} from "@/features/media/sub-features/admin/ui/AdminActionDialog.tsx";
import {useBanArtist} from "@/features/media/sub-features/admin/hooks/useAdminMutations.ts";
import * as Dialog from '@radix-ui/react-dialog';


export const AdminReviewInspectorPage = () => {
    const {id: trackId} = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [selectedVerdict, setSelectedVerdict] = useState<AdminVerdict | null>(null);
    const [isBanUserModalOpen, setIsBanUserModalOpen] = useState(false);
    const [banUserReason, setBanUserReason] = useState('');

    // Fetch deep moderation details & audit history
    const {data: details, isLoading: isDetailsLoading} = useAdminTrackDetails(trackId!);
    const {mutate: executeUserBan, isPending: isBanUserPending} = useBanArtist();

    // Fetch standard playable TrackDto specifically for the TrackCard/PlayerBar
    const {data: playableTrack, isLoading: isTrackLoading} = useQuery({
        queryKey: ['track', trackId],
        queryFn: () => mediaApi.getTrack(trackId!),
        enabled: !!trackId,
    });

    if (isDetailsLoading || isTrackLoading) {
        return (
            <div className="flex h-[80vh] items-center justify-center text-emerald-500">
                <Loader2 size={40} className="animate-spin"/>
            </div>
        );
    }

    if (!details || !playableTrack) return null;

    // Strict Backend Finite State Machine Guards Mapped to UI Buttons
    const canApprove = ['IN_REVIEW', 'APPROVED', 'PUBLISHED'].includes(details.status);
    const canReject = ['IN_REVIEW'].includes(details.status);
    const canRestore = ['BANNED', 'REJECTED'].includes(details.status);
    const canSuspend = !['BANNED', 'ARCHIVED'].includes(details.status);

    // ARCHIVED is a terminal state. We can force-archive a track from any other state (e.g. DMCA takedown of a BANNED track).
    const canArchive = details.status !== 'ARCHIVED';

    const handleBanArtistSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!banUserReason.trim()) return;

        executeUserBan({
            artistId: details.artistId,
            reason: banUserReason.trim()
        }, {
            onSuccess: () => {
                setIsBanUserModalOpen(false);
                setBanUserReason('');
            }
        });
    };

    return (
        <div className="max-w-[1600px] mx-auto p-6 space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-4 border-b border-slate-800 pb-6">
                <button
                    onClick={() => navigate(-1)} // Native back navigation preserves search parameters and page history
                    className="p-2 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                    <ArrowLeft size={20}/>
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-white tracking-tight">Review Inspector</h1>
                    <p className="text-sm text-slate-400 font-mono mt-1">Track ID: {details.trackId}</p>
                </div>
                <TrackStatusBadge status={details.status}/>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

                {/* LEFT PANE: Playback & Selective Actions Mapping */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Playback
                            Context</h3>

                        <div className="mb-6">
                            <TrackCard track={playableTrack} variant="list" className="bg-slate-950 border-slate-800"/>
                        </div>

                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Artist Alias</span>
                                <span className="text-slate-200 font-medium">{details.artistAlias}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Artist Handle</span>
                                <span className="text-slate-400">@{details.artistUsername}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Appealed</span>
                                <span className={details.hasAppealed ? "text-amber-400 font-medium" : "text-slate-400"}>
                                    {details.hasAppealed ? 'Yes (Requires Priority)' : 'No'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* FSM Guarded Action Matrix */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-3">
                        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Guarded
                            Transitions</h3>

                        {canApprove && (
                            <button onClick={() => setSelectedVerdict('APPROVE')}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors font-medium text-sm">
                                <ShieldCheck size={16}/> Force Approve
                            </button>
                        )}
                        {canReject && (
                            <button onClick={() => setSelectedVerdict('REJECT')}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition-colors font-medium text-sm">
                                <Gavel size={16}/> Reject (Needs Revision)
                            </button>
                        )}
                        {canRestore && (
                            <button onClick={() => setSelectedVerdict('RESTORE')}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition-colors font-medium text-sm">
                                <ArchiveRestore size={16}/> Restore to Registry
                            </button>
                        )}
                        {canArchive && (
                            <button onClick={() => setSelectedVerdict('FORCE_ARCHIVE')}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 transition-colors font-medium text-sm">
                                <ArchiveRestore size={16}/> Force Archive (DMCA)
                            </button>
                        )}
                        {canSuspend && (
                            <button onClick={() => setSelectedVerdict('BAN')}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors font-medium text-sm">
                                <Ban size={16}/> Suspend Track (Strike)
                            </button>
                        )}

                        <div className="h-px bg-slate-800 my-4"/>

                        {/* Global Identity Action (Cross-Module Lockdown Trigger) */}
                        <button
                            onClick={() => setIsBanUserModalOpen(true)}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors font-medium text-sm shadow-lg shadow-red-900/20"
                        >
                            <UserX size={16}/> Ban Artist Account
                        </button>
                    </div>
                </div>

                {/* RIGHT PANE: FSM Timeline */}
                <div className="lg:col-span-2">
                    <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-6 min-h-[600px]">
                        <h3 className="text-lg font-semibold text-white mb-2">Audit History Timeline</h3>
                        <p className="text-sm text-slate-400 mb-8">Chronological record of state mutations, actor
                            actions, and raw AI decisions.</p>

                        <TrackAuditTimeline history={details.auditHistory}/>
                    </div>
                </div>
            </div>

            {/* Standard Verdict Dialog */}
            <AdminActionDialog
                trackId={details.trackId}
                verdict={selectedVerdict}
                onClose={() => setSelectedVerdict(null)}
            />

            {/* Global Identity Lockdown Destructive Dialog */}
            <Dialog.Root open={isBanUserModalOpen}
                         onOpenChange={(open) => !open && !isBanUserPending && setIsBanUserModalOpen(false)}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60]"/>
                    <Dialog.Content
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-[60] overflow-hidden p-6 animate-in zoom-in-95">
                        <div className="flex flex-col items-center text-center space-y-3 mb-6">
                            <div className="p-3 bg-red-500/10 text-red-500 rounded-full">
                                <UserX size={24}/>
                            </div>
                            <Dialog.Title className="text-xl font-bold text-slate-100">Ban Artist Account</Dialog.Title>
                            <Dialog.Description className="text-sm text-slate-400 leading-relaxed">
                                You are executing a high-privilege administrative lockdown. This action will emit a
                                global <span className="text-slate-200 font-mono font-bold">UserBannedEvent</span> to
                                terminate sessions and suspend all existing catalog content for <span
                                className="text-slate-200 font-semibold">@{details.artistUsername}</span>.
                            </Dialog.Description>
                        </div>

                        <form id="ban-artist-form" onSubmit={handleBanArtistSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Account
                                    Termination Reason</label>
                                <textarea
                                    value={banUserReason}
                                    onChange={(e) => setBanUserReason(e.target.value)}
                                    placeholder="Provide legal or policy-based justification for this account suspension..."
                                    rows={3}
                                    className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 placeholder-slate-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all resize-none"
                                    required
                                />
                            </div>
                        </form>

                        <div className="flex gap-3 mt-6">
                            <button type="button" onClick={() => setIsBanUserModalOpen(false)}
                                    disabled={isBanUserPending}
                                    className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="ban-artist-form"
                                disabled={isBanUserPending || !banUserReason.trim()}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-red-900/20"
                            >
                                {isBanUserPending ? <Loader2 size={16} className="animate-spin"/> : <UserX size={16}/>}
                                Confirm Ban
                            </button>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </div>
    );
};