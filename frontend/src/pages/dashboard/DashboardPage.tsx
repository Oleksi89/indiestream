import {useAuthStore} from '@/shared/store/authStore';
import {PublicFeed} from '@/features/media/ui/PublicFeed';

export const DashboardPage = () => {
    const user = useAuthStore((state) => state.user);

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl space-y-12">

            {/* Header Section */}
            <header className="border-b border-slate-800 pb-6">
                <h1 className="text-4xl font-bold tracking-tight text-white">
                    Good evening, <span className="text-violet-400">{user?.alias || 'Listener'}</span>
                </h1>
                <p className="text-slate-400 mt-2 text-lg">Discover new independent music tailored for you.</p>
            </header>

            {/* AI Recommendations Placeholder (Future Feature) */}
            <section>
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    Recommended for You
                    <span
                        className="text-xs px-2 py-1 bg-violet-500/20 text-violet-400 rounded-full font-medium border border-violet-500/30">AI Beta</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i}
                             className="h-32 rounded-xl border border-slate-800 border-dashed bg-slate-900/30 p-6 flex items-center justify-center">
                            <p className="text-sm text-slate-500 text-center">
                                Listening history required.<br/>Play more tracks to generate recommendations.
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Global Public Feed */}
            <section>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white">New Releases</h2>
                    {/* TODO: [UI] - Add 'View All' link with pagination route */}
                    <button className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
                        Show all
                    </button>
                </div>
                <PublicFeed/>
            </section>

        </div>
    );
};