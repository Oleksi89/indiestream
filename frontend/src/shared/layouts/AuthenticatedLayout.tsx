import {Outlet} from 'react-router-dom';
import {Navbar} from '@/shared/components/Navbar';
import {PlayerBar} from '@/features/media/sub-features/playback/ui/PlayerBar.tsx';
import {usePlayerStore} from '@/shared/store/playerStore';
import {LibrarySidebar} from '@/features/playlist/ui/LibrarySidebar';
import {QueueSlideover} from '@/features/media/sub-features/playback/ui/QueueSlideover.tsx';
import {cn} from "@/shared/lib/utils.ts";

/**
 * Layout for authenticated pages.
 * Includes the persistent navigation, the reactive Library Sidebar,
 * content container, global audio player, and dynamic Queue Slideover.
 */
export const AuthenticatedLayout = () => {
    const {currentTrack, isQueueOpen} = usePlayerStore();

    return (
        <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden relative">
            {/* Persistent Library Sidebar (Left) */}
            <LibrarySidebar/>

            {/* Central Content Area - Dynamically resizes when Queue is open */}
            <div className={cn(
                "flex-1 flex flex-col min-w-0 relative transition-all duration-300",
                isQueueOpen ? "mr-96" : "mr-0" // w-96 = 24rem (384px)
            )}>
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

            {/* Right Sidebar Overlay (Queue Engine) */}
            <QueueSlideover/>
        </div>
    );
};