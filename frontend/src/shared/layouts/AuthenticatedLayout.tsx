import {Outlet} from 'react-router-dom';
import {Navbar} from '@/shared/components/Navbar';
import {PlayerBar} from '@/features/media/ui/PlayerBar';
import {usePlayerStore} from '@/shared/store/playerStore';
import {LibrarySidebar} from '@/features/playlist/ui/LibrarySidebar';
import {cn} from "@/shared/lib/utils.ts";

/**
 * Layout for authenticated pages.
 * Includes the persistent navigation, the reactive Library Sidebar,
 * content container, and global audio player.
 */
export const AuthenticatedLayout = () => {
    // Observe the currentTrack to determine if the player bar is visible
    const currentTrack = usePlayerStore((state) => state.currentTrack);

    return (
        <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
            {/* Persistent Library Sidebar */}
            <LibrarySidebar/>

            <div className="flex-1 flex flex-col min-w-0 relative">
                <Navbar/>

                <main className={cn(
                    "flex-1 overflow-y-auto px-6 py-8 transition-all duration-300",
                    currentTrack ? 'pb-32' : 'pb-8'
                )}>
                    <div className="mx-auto max-w-screen-2xl">
                        <Outlet/>
                    </div>
                </main>

                {/* The global player bar at the bottom */}
                <div className="absolute bottom-0 left-0 right-0 z-50">
                    <PlayerBar/>
                </div>
            </div>
        </div>
    );
};