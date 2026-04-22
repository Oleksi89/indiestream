import {UploadTrackForm} from '@/features/media/ui/UploadTrackForm';
import {TrackList} from '@/features/media/ui/TrackList';
import {useAuthStore} from '@/shared/store/authStore';

export const ArtistDashboardPage = () => {
    // We assume the user is present because this route should be protected by <RoleRoute>
    const user = useAuthStore((state) => state.user);

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            {/* Dashboard Header */}
            <div className="mb-8 border-b border-slate-800 pb-6">
                <h1 className="text-3xl font-bold text-white tracking-tight">Artist Studio</h1>
                <p className="text-slate-400 mt-2">
                    Welcome back, <span className="text-violet-400 font-medium">{user?.username || 'Artist'}</span>.
                    Manage your music catalog and upload new master tracks.
                </p>
            </div>

            {/* Dashboard Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Left Column: Upload Section (Spans 5 columns on large screens) */}
                <div className="lg:col-span-5 2xl:col-span-4 flex flex-col gap-6">
                    <UploadTrackForm/>

                    {/* Placeholder for future analytics or guidelines module */}
                    <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50">
                        <h3 className="text-sm font-semibold text-slate-200 mb-2">Upload Guidelines</h3>
                        <ul className="text-xs text-slate-400 space-y-2 list-disc list-inside">
                            <li>Ensure audio is uncompressed (WAV/FLAC) for best AI stem extraction.</li>
                            <li>Cover art should be square (1:1 aspect ratio), min 500x500px.</li>
                            <li>Do not upload copyrighted material without authorization.</li>
                        </ul>
                    </div>
                </div>

                {/* Right Column: Library Section (Spans 7 columns on large screens) */}
                <div className="lg:col-span-7 2xl:col-span-8">
                    <TrackList/>
                </div>

            </div>
        </div>
    );
};