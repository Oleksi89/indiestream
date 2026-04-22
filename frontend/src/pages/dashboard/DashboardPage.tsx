export const DashboardPage = () => {
    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-3xl font-bold tracking-tight text-white">Welcome back!</h1>
                <p className="text-slate-400 mt-1">Explore your artist dashboard and statistics.</p>
            </header>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Placeholder cards */}
                {[1, 2, 3].map((i) => (
                    <div key={i}
                         className="h-48 rounded-2xl border border-slate-800 bg-slate-900/50 p-6 transition-colors hover:border-violet-500/30">
                        <div className="h-10 w-10 rounded-full bg-violet-500/10"/>
                        <div className="mt-4 h-4 w-3/4 rounded bg-slate-800"/>
                        <div className="mt-2 h-4 w-1/2 rounded bg-slate-800"/>
                    </div>
                ))}
            </div>
        </div>
    );
};