import {create} from 'zustand';
import {persist} from 'zustand/middleware';

export type SidebarViewMode = 'collapsed' | 'normal' | 'expanded';
export type LibraryFilter = 'ALL' | 'PLAYLISTS' | 'PROFILES';

interface LibraryState {
    viewMode: SidebarViewMode;
    setViewMode: (mode: SidebarViewMode) => void;
    cycleViewMode: () => void;
    activeFilter: LibraryFilter;
    setActiveFilter: (filter: LibraryFilter) => void;
}

/**
 * Manages the UI state of the Library Sidebar.
 * Uses persist middleware to remember the user's preferred layout across sessions.
 */
export const useLibraryStore = create<LibraryState>()(
    persist(
        (set) => ({
            viewMode: 'normal',
            activeFilter: 'ALL',
            setViewMode: (mode) => set({viewMode: mode}),
            cycleViewMode: () => set((state) => {
                const modes: SidebarViewMode[] = ['collapsed', 'normal', 'expanded'];
                const currentIndex = modes.indexOf(state.viewMode);
                const nextIndex = (currentIndex + 1) % modes.length;
                return {viewMode: modes[nextIndex]};
            }),
            setActiveFilter: (filter) => set({activeFilter: filter}),
        }),
        {
            name: 'indiestream-library-ui-state',
        }
    )
);