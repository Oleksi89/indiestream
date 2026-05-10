import {useState, useEffect, useCallback} from 'react';

export const useContextMenu = () => {
    const [position, setPosition] = useState({x: 0, y: 0});
    const [isOpen, setIsOpen] = useState(false);

    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // Ensure menu doesn't overflow the viewport
        const x = Math.min(e.pageX, window.innerWidth - 200);
        const y = Math.min(e.pageY, window.innerHeight - 250);

        setPosition({x, y});
        setIsOpen(true);
    }, []);

    const closeMenu = useCallback(() => setIsOpen(false), []);

    // Close on any click outside or escape key
    useEffect(() => {
        if (!isOpen) return;

        const handleClick = () => closeMenu();
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeMenu();
        };

        document.addEventListener('click', handleClick);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('click', handleClick);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, closeMenu]);

    return {position, isOpen, handleContextMenu, closeMenu};
};