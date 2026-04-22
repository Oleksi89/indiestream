import {Outlet} from 'react-router-dom';
import {Navbar} from '@/shared/components/Navbar';
import {PlayerBar} from '@/features/media/ui/PlayerBar';
import {usePlayerStore} from '@/shared/store/playerStore';

/**
 * Layout for authenticated pages.
 * Includes the persistent navigation, content container, and global audio player.
 */
export const AuthenticatedLayout = () => {
    // Observe the currentTrack to determine if the player bar is visible
    const currentTrack = usePlayerStore((state) => state.currentTrack);

    return (
        <div
            className={`min-h-screen bg-slate-950 text-slate-100 transition-all duration-300 ${currentTrack ? 'pb-24' : ''}`}>
            <Navbar/>
            <main className="mx-auto max-w-screen-2xl px-6 py-8">
                <Outlet/>
            </main>

            {/* The global player outside the routing context */}
            <PlayerBar/>
        </div>
    );
};