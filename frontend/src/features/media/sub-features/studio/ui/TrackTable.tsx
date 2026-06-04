import {useStudioTracks} from '../../../hooks/useTrackQueries.ts';
import {Loader2} from 'lucide-react';
import {TrackTableRow} from "@/features/media/sub-features/studio/ui/TrackTableRow.tsx";

export const TrackTable = () => {
    const {data, isLoading, error} = useStudioTracks();

    if (isLoading) {
        return (
            <div
                className="flex justify-center items-center h-64 w-full rounded-2xl border border-slate-800 bg-slate-900/50">
                <Loader2 className="animate-spin text-violet-500" size={32}/>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div
                className="flex justify-center items-center h-64 w-full rounded-2xl border border-red-900/50 bg-red-900/10 text-red-400">
                Failed to load tracks. Please try again.
            </div>
        );
    }

    if (data.content.length === 0) {
        return (
            <div
                className="flex flex-col justify-center items-center h-64 w-full rounded-2xl border border-slate-800 bg-slate-900/50 text-slate-400">
                <p className="mb-2">Your catalog is empty.</p>
                <p className="text-sm">Upload your first track using the wizard.</p>
            </div>
        );
    }

    return (
        <div className="w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-950/50 text-xs uppercase text-slate-500 border-b border-slate-800">
                    <tr>
                        <th className="px-6 py-4 font-medium">Track</th>
                        <th className="px-6 py-4 font-medium">Status</th>
                        <th className="px-6 py-4 font-medium hidden md:table-cell">Uploaded Date</th>
                        <th className="px-6 py-4 font-medium text-right">Actions</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                    {data.content.map((track) => (
                        <TrackTableRow key={track.id} track={track}/>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};