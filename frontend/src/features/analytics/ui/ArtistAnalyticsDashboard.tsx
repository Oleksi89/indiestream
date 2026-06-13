import {ArrowLeft} from 'lucide-react';
import {useSearchParams} from 'react-router-dom';
import {useAnalyticsTimeRange} from '../hooks/useAnalyticsTimeRange';
import {TimeRangeSelector} from './TimeRangeSelector.tsx';
import {Button} from '@/shared/ui/button.tsx';
import {GlobalOverview} from './GlobalOverview.tsx';
import {TrackDeepDive} from './TrackDeepDive.tsx';

export const ArtistAnalyticsDashboard = () => {
    const {preset, setRange, startDate, endDate} = useAnalyticsTimeRange('7D');
    const [searchParams, setSearchParams] = useSearchParams();
    const selectedTrackId = searchParams.get('trackId');

    const handleSelectTrack = (id: string | null) => {
        setSearchParams(prev => {
            if (id) prev.set('trackId', id);
            else prev.delete('trackId');
            return prev;
        }, {replace: true});
    };

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            {/* Header / Config Panel */}
            <div
                className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-slate-900/30 p-4 rounded-xl border border-slate-800 shadow-sm">
                <div className="flex items-center gap-4">
                    {selectedTrackId && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleSelectTrack(null)}
                            className="rounded-full bg-slate-800 text-slate-300 hover:text-white transition-colors"
                        >
                            <ArrowLeft size={18}/>
                        </Button>
                    )}
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-tight">
                            {selectedTrackId ? 'Track Deep Dive' : 'Global Performance'}
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                            {selectedTrackId ? 'Granular telemetry and real-time listening data.' : 'Macro perspective of your entire catalog.'}
                        </p>
                    </div>
                </div>
                <TimeRangeSelector value={preset} onChange={setRange}/>
            </div>

            {/* Dynamic View Injection */}
            <div className="pt-2">
                {selectedTrackId ? (
                    <TrackDeepDive trackId={selectedTrackId} startDate={startDate} endDate={endDate}/>
                ) : (
                    <GlobalOverview startDate={startDate} endDate={endDate} onSelectTrack={handleSelectTrack}/>
                )}
            </div>
        </div>
    );
};