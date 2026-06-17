import {useStudioTracks} from '../../../hooks/useTrackQueries.ts';
import {Loader2} from 'lucide-react';
import {TrackTableRow} from './TrackTableRow';
import type {TrackDto} from '../../../types';
import type {TrackModalType} from './OwnedTrackDropdownMenu';
import {useTranslation} from '@/shared/lib/i18n/useTranslation';

// Dynamically imported Modals to keep initial bundle size small
import {EditTrackModal} from './EditTrackModal';
import {PublishTrackDialog} from './PublishTrackDialog';
import {ArchiveTrackDialog} from './ArchiveTrackDialog';
import {AppealBanModal} from '../../moderation/ui/AppealBanModal';
import {TrackResolutionModal} from '../../moderation/ui/TrackResolutionModal';
import {useState} from "react";


interface ModalState {
    type: TrackModalType;
    track: TrackDto;
}

export const TrackTable = () => {
    const {data, isLoading, error} = useStudioTracks();
    const [activeModal, setActiveModal] = useState<ModalState | null>(null);
    const {t} = useTranslation();
    const tbl = t.media.studio.trackTable;

    const handleCloseModal = () => setActiveModal(null);

    const handleOpenModal = (type: TrackModalType, track: TrackDto) => {
        setActiveModal({type, track});
    };

    if (isLoading) {
        return (
            <div
                className="flex justify-center items-center h-64 w-full rounded-2xl border border-slate-800 bg-slate-900/50"
                aria-busy="true"
                aria-label={tbl.loading}>
                <Loader2 className="animate-spin text-violet-500" size={32} aria-hidden="true"/>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div
                role="alert"
                className="flex justify-center items-center h-64 w-full rounded-2xl border border-red-900/50 bg-red-900/10 text-red-400">
                {tbl.error}
            </div>
        );
    }

    if (data.content.length === 0) {
        return (
            <div
                className="flex flex-col justify-center items-center h-64 w-full rounded-2xl border border-slate-800 bg-slate-900/50 text-slate-400">
                <p className="mb-2 font-medium text-slate-300">{tbl.emptyTitle}</p>
                <p className="text-sm">{tbl.emptySubtitle}</p>
            </div>
        );
    }

    return (
        <div className="w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-950/50 text-xs uppercase text-slate-500 border-b border-slate-800">
                    <tr>
                        <th scope="col" className="px-6 py-4 font-medium">{tbl.columnTrack}</th>
                        <th scope="col" className="px-6 py-4 font-medium">{tbl.columnStatus}</th>
                        <th scope="col" className="px-6 py-4 font-medium hidden md:table-cell">{tbl.columnDate}</th>
                        <th scope="col" className="px-6 py-4 font-medium text-right">{tbl.columnActions}</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                    {data.content.map((track) => (
                        <TrackTableRow key={track.id} track={track} onOpenModal={handleOpenModal}/>
                    ))}
                    </tbody>
                </table>
            </div>

            {/* --- Centralized Modals --- */}
            {activeModal?.type === 'EDIT' && (
                <EditTrackModal track={activeModal.track} isOpen={true} onClose={handleCloseModal}/>
            )}

            {activeModal?.type === 'PUBLISH' && (
                <PublishTrackDialog track={activeModal.track} isOpen={true} onClose={handleCloseModal}/>
            )}

            {activeModal?.type === 'ARCHIVE' && (
                <ArchiveTrackDialog track={activeModal.track} isOpen={true} onClose={handleCloseModal}/>
            )}

            {activeModal?.type === 'APPEAL' && (
                <AppealBanModal track={activeModal.track} isOpen={true} onClose={handleCloseModal}/>
            )}

            {activeModal?.type === 'RESOLUTION' && (
                <TrackResolutionModal track={activeModal.track} isOpen={true} onClose={handleCloseModal}/>
            )}
        </div>
    );
};
