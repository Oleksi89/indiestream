import {UploadTrackForm} from '@/features/media/ui/UploadTrackForm';

export const ArtistDashboardPage = () => {
    return (
        <div className="space-y-8">
            <header className="border-b border-slate-800 pb-6">
                <h1 className="text-3xl font-bold tracking-tight text-white">Artist Hub</h1>
                <p className="text-slate-400 mt-2">Manage your releases and upload new master tracks to the IndieStream
                    catalog.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <UploadTrackForm/>
                </div>
                <div className="space-y-6">
                    {/* Placeholder for future artist statistics or tips */}
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                        <h3 className="text-lg font-medium text-white">Upload Guidelines</h3>
                        <ul className="mt-4 space-y-2 text-sm text-slate-400 list-disc list-inside">
                            <li>Upload high-quality uncompressed audio.</li>
                            <li>Maximum file size is 50MB.</li>
                            <li>Stems will be automatically processed.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};