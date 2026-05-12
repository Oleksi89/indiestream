import {useState, useEffect, useCallback, useId} from 'react';
import {create} from 'zustand';

interface ContextMenuState {
    activeMenuId: string | null;
    setActiveMenuId: (id: string | null) => void;
}

// Global store to guarantee strictly ONE active context menu across the app
const useContextMenuStore = create<ContextMenuState>((set) => ({
    activeMenuId: null,
    setActiveMenuId: (id) => set({activeMenuId: id}),
}));

export const useContextMenu = () => {
    const id = useId(); // Generate unique ID for each consumer
    const {activeMenuId, setActiveMenuId} = useContextMenuStore();

    const isOpen = activeMenuId === id;
    const [position, setPosition] = useState({x: 0, y: 0});

    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // Ensure menu doesn't overflow the viewport
        const x = Math.min(e.pageX, window.innerWidth - 200);
        const y = Math.min(e.pageY, window.innerHeight - 250);

        setPosition({x, y});
        setActiveMenuId(id);
    }, [id, setActiveMenuId]);

    const closeMenu = useCallback(() => {
        if (useContextMenuStore.getState().activeMenuId === id) {
            setActiveMenuId(null);
        }
    }, [id, setActiveMenuId]);

    // Close on any click outside, escape key, or scroll
    useEffect(() => {
        if (!isOpen) return;

        const handleGlobalClose = () => setActiveMenuId(null);
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setActiveMenuId(null);
        };

        // Capture clicks globally, even those stopping propagation in standard ways
        document.addEventListener('click', handleGlobalClose, {capture: true});
        document.addEventListener('contextmenu', () => {
            // Close if right-clicking anywhere else
            if (useContextMenuStore.getState().activeMenuId === id) {
                setActiveMenuId(null);
            }
        });
        document.addEventListener('keydown', handleKeyDown);
        window.addEventListener('scroll', handleGlobalClose, {passive: true});

        return () => {
            document.removeEventListener('click', handleGlobalClose, {capture: true});
            document.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('scroll', handleGlobalClose);
        };
    }, [isOpen, id, setActiveMenuId]);

    return {position, isOpen, handleContextMenu, closeMenu};
};