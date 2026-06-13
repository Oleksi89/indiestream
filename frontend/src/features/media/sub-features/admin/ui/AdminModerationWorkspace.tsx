import {useState} from 'react';
import {Gavel, ShieldCheck, ArchiveRestore, Ban, UserX, UserCheck, Loader2} from 'lucide-react';
import type {AdminTrackDetailsDto, AdminVerdict, TrackDto} from "@/features/media/types";
import {TrackCard} from "@/features/media/ui/TrackCard.tsx";
import {TrackAuditTimeline} from "./TrackAuditTimeline.tsx";
import {AdminActionDialog} from "./AdminActionDialog.tsx";
import {useBanArtist, useUnbanArtist} from "../hooks/useAdminMutations.ts";
import * as Dialog from '@radix-ui/react-dialog';
interface AdminModerationWorkspaceProps {
    details: AdminTrackDetailsDto;
    playableTrack: TrackDto;
}

export const AdminModerationWorkspace = ({details, playableTrack}: AdminModerationWorkspaceProps) => {
    const [selectedVerdict, setSelectedVerdict] = useState<AdminVerdict | null>(null);
    const [isBanUserModalOpen, setIsBanUserModalOpen] = useState(false);
    const [isUnbanUserModalOpen, setIsUnbanUserModalOpen] = useState(false);
    const [userActionReason, setUserActionReason] = useState('');

    const {mutate: executeUserBan, isPending: isBanUserPending} = useBanArtist();
    const {mutate: executeUserUnban, isPending: isUnbanUserPending} = useUnbanArtist();

    // Strict Backend Finite State Machine Guards
    const canApprove = ['IN_REVIEW', 'APPROVED', 'PUBLISHED'].includes(details.status);
    const canReject = ['IN_REVIEW'].includes(details.status);
    const canRestore = ['BANNED', 'REJECTED'].includes(details.status);
    const canSuspend = !['BANNED', 'ARCHIVED'].includes(details.status);
    const canArchive = details.status !== 'ARCHIVED';

    const handleUserAction = (type: 'BAN' | 'UNBAN') => async (formData: FormData) => {
        const reason = formData.get('reason')?.toString().trim();
        if (!reason) return;

        const payload = {artistId: details.artistId, reason};
        const options = {
            onSuccess: () => {
                setIsBanUserModalOpen(false);
                setIsUnbanUserModalOpen(false);
                setUserActionReason('');
            }
        };

        if (type === 'BAN') executeUserBan(payload, options);
        else executeUserUnban(payload, options);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start animate-in fade-in duration-300">
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

                    <div className="flex gap-3">
                        <button onClick={() => {
                            setIsBanUserModalOpen(true);
                            setUserActionReason('');
                        }}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors font-medium text-sm shadow-lg shadow-red-900/20">
                            <UserX size={16}/> Ban Artist
                        </button>
                        <button onClick={() => {
                            setIsUnbanUserModalOpen(true);
                            setUserActionReason('');
                        }}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors font-medium text-sm shadow-lg shadow-emerald-900/20">
                            <UserCheck size={16}/> Unban Artist
                        </button>
                    </div>
                </div>
            </div>

            {/* RIGHT PANE: FSM Timeline */}
            <div className="lg:col-span-2">
                <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-6 min-h-[600px]">
                    <h3 className="text-lg font-semibold text-white mb-2">Audit History Timeline</h3>
                    <p className="text-sm text-slate-400 mb-8">Chronological record of state mutations, actor actions,
                        and raw AI decisions.</p>
                    <TrackAuditTimeline history={details.auditHistory}/>
                </div>
            </div>

            {/* Modals Implementation */}
            <AdminActionDialog trackId={details.trackId} verdict={selectedVerdict}
                               onClose={() => setSelectedVerdict(null)}/>

            {/* Ban Modal */}
            <Dialog.Root open={isBanUserModalOpen}
                         onOpenChange={(open) => !open && !isBanUserPending && setIsBanUserModalOpen(false)}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60]"/>
                    <Dialog.Content
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-[60] overflow-hidden p-6 animate-in zoom-in-95">
                        <div className="flex flex-col items-center text-center space-y-3 mb-6">
                            <div className="p-3 bg-red-500/10 text-red-500 rounded-full"><UserX size={24}/></div>
                            <Dialog.Title className="text-xl font-bold text-slate-100">Ban Artist Account</Dialog.Title>
                            <Dialog.Description className="text-sm text-slate-400 leading-relaxed">
                                You are executing a high-privilege administrative lockdown. This action will emit a
                                global <span
                                className="text-slate-200 font-mono font-bold">UserBannedEvent</span> for <span
                                className="text-slate-200 font-semibold">@{details.artistUsername}</span>.
                            </Dialog.Description>
                        </div>
                        <form id="ban-artist-form" action={handleUserAction('BAN')} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Account
                                    Termination Reason</label>
                                <textarea name="reason" value={userActionReason}
                                          onChange={(e) => setUserActionReason(e.target.value)} rows={3}
                                          className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 outline-none resize-none"
                                          required/>
                            </div>
                        </form>
                        <div className="flex gap-3 mt-6">
                            <button type="button" onClick={() => setIsBanUserModalOpen(false)}
                                    disabled={isBanUserPending}
                                    className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-300 bg-slate-800 rounded-lg">Cancel
                            </button>
                            <button type="submit" form="ban-artist-form"
                                    disabled={isBanUserPending || !userActionReason.trim()}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg">
                                {isBanUserPending ? <Loader2 size={16} className="animate-spin"/> :
                                    <UserX size={16}/>} Confirm Ban
                            </button>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            {/* Unban Modal */}
            <Dialog.Root open={isUnbanUserModalOpen}
                         onOpenChange={(open) => !open && !isUnbanUserPending && setIsUnbanUserModalOpen(false)}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60]"/>
                    <Dialog.Content
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-[60] overflow-hidden p-6 animate-in zoom-in-95">
                        <div className="flex flex-col items-center text-center space-y-3 mb-6">
                            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-full"><UserCheck size={24}/>
                            </div>
                            <Dialog.Title className="text-xl font-bold text-slate-100">Restore Artist
                                Account</Dialog.Title>
                            <Dialog.Description className="text-sm text-slate-400 leading-relaxed">
                                Lifting the suspension for <span
                                className="text-slate-200 font-semibold">@{details.artistUsername}</span>. Banned tracks
                                must be manually restored.
                            </Dialog.Description>
                        </div>
                        <form id="unban-artist-form" action={handleUserAction('UNBAN')} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Restoration
                                    Reasoning</label>
                                <textarea name="reason" value={userActionReason}
                                          onChange={(e) => setUserActionReason(e.target.value)} rows={3}
                                          className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 outline-none resize-none"
                                          required/>
                            </div>
                        </form>
                        <div className="flex gap-3 mt-6">
                            <button type="button" onClick={() => setIsUnbanUserModalOpen(false)}
                                    disabled={isUnbanUserPending}
                                    className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-300 bg-slate-800 rounded-lg">Cancel
                            </button>
                            <button type="submit" form="unban-artist-form"
                                    disabled={isUnbanUserPending || !userActionReason.trim()}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg">
                                {isUnbanUserPending ? <Loader2 size={16} className="animate-spin"/> :
                                    <UserCheck size={16}/>} Confirm Unban
                            </button>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </div>
    );
};