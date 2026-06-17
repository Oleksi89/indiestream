import {ChevronRight, FileAudio, Clock} from 'lucide-react';
import type {AdminTrackSummaryDto} from '../../../types';
import {TrackStatusBadge} from '../../moderation/ui/TrackStatusBadge';
import {useTranslation} from '@/shared/lib/i18n/useTranslation';

interface AdminTrackTableProps {
    tracks: AdminTrackSummaryDto[];
    isLoading: boolean;
    onRowClick: (trackId: string) => void;
}

export const AdminTrackTable = ({tracks, isLoading, onRowClick}: AdminTrackTableProps) => {
    const {t} = useTranslation();
    const tbl = t.media.admin.table;

    if (!tracks.length && !isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                <FileAudio size={48} className="mb-4 text-slate-600 opacity-50" aria-hidden="true"/>
                <p className="text-lg font-medium text-slate-300">{tbl.noTracks}</p>
                <p className="text-sm">{tbl.noTracksHint}</p>
            </div>
        );
    }

    return (
        <div className="w-full overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/50 shadow-xl">
            <table
                className={`w-full text-left text-sm text-slate-300 transition-opacity duration-200 ${isLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}
                aria-busy={isLoading}>
                <thead
                    className="bg-slate-950/80 text-xs uppercase text-slate-500 border-b border-slate-800 backdrop-blur-sm">
                <tr>
                    <th scope="col" className="px-6 py-4 font-medium tracking-wider">{tbl.columnId}</th>
                    <th scope="col" className="px-6 py-4 font-medium tracking-wider">{tbl.columnTrack}</th>
                    <th scope="col" className="px-6 py-4 font-medium tracking-wider">{tbl.columnArtist}</th>
                    <th scope="col" className="px-6 py-4 font-medium tracking-wider">{tbl.columnStatus}</th>
                    <th scope="col" className="px-6 py-4 font-medium tracking-wider hidden md:table-cell">{tbl.columnDate}</th>
                    <th scope="col" className="px-6 py-4 font-medium text-right tracking-wider">{tbl.columnAction}</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                {tracks.map((track) => (
                    <tr
                        key={track.id}
                        onClick={() => onRowClick(track.id)}
                        tabIndex={0}
                        role="button"
                        aria-label={tbl.openInspector.replace('{title}', track.title)}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onRowClick(track.id)}
                        className="group cursor-pointer hover:bg-slate-800/40 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500"
                    >
                        <td className="px-6 py-4 text-xs font-mono text-slate-500">
                            {track.id.substring(0, 8)}...
                        </td>
                        <td className="px-6 py-4">
                            <div
                                className="font-medium text-slate-200 group-hover:text-emerald-400 transition-colors max-w-[250px] truncate">
                                {track.title}
                            </div>
                        </td>
                        <td className="px-6 py-4">
                            <div className="flex flex-col">
                                <span
                                    className="font-medium text-slate-300 truncate max-w-[150px]">{track.artistAlias}</span>
                                <span
                                    className="text-xs text-slate-500 truncate max-w-[150px]">@{track.artistUsername}</span>
                            </div>
                        </td>
                        <td className="px-6 py-4">
                            <TrackStatusBadge status={track.status}/>
                        </td>
                        <td className="px-6 py-4 hidden md:table-cell text-slate-400 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-xs">
                                <Clock size={12} className="text-slate-500" aria-hidden="true"/>
                                {new Date(track.createdAt).toLocaleDateString(undefined, {
                                    year: 'numeric', month: 'short', day: 'numeric'
                                })}
                            </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                            <div
                                className="inline-flex items-center justify-center p-1.5 rounded-md text-slate-400 group-hover:bg-emerald-500/10 group-hover:text-emerald-400 transition-colors"
                                aria-hidden="true">
                                <ChevronRight size={18}/>
                            </div>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
};
