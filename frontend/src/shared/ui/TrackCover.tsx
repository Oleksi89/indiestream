import {Disc3} from 'lucide-react';
import {useSecureUrl} from '@/shared/hooks/useSecureUrl.ts';
import {mediaApi} from '@/features/media/api/media.api.ts';

interface TrackCoverProps {
    trackId: string;
    path: string | null;
    size?: string;
}

export const TrackCover = ({trackId, path, size = "w-8 h-8 rounded"}: TrackCoverProps) => {
    const {url} = useSecureUrl(`cover-micro-${trackId}`, () => mediaApi.getTrackCoverBlob(trackId), !!path);
    return (
        <div className={`${size} overflow-hidden bg-slate-800 flex items-center justify-center shrink-0`}>
            {url ? (
                <img src={url} alt="cover" className="w-full h-full object-cover"/>
            ) : (
                <Disc3 size={14} className="text-slate-600"/>
            )}
        </div>
    );
};