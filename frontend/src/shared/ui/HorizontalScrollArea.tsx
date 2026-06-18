import React, {useRef, useState, useEffect, useCallback} from 'react';
import {ChevronLeft, ChevronRight} from 'lucide-react';
import {cn} from '@/shared/lib/utils';

interface HorizontalScrollAreaProps {
    children: React.ReactNode;
    className?: string;
    /** Allows overriding the internal scroll container styles (like gap or padding) */
    contentClassName?: string;
}

/**
 * Universal horizontal scrolling container.
 * Automatically handles overflow state, scroll snapping, and renders interactive glassmorphism navigation arrows.
 * Enforces Single Responsibility Principle by abstracting scroll math from presentation components.
 */
export const HorizontalScrollArea = ({children, className, contentClassName}: HorizontalScrollAreaProps) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(false);

    const checkScrollPosition = useCallback(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const {scrollLeft, scrollWidth, clientWidth} = container;

        // 1px buffer handles sub-pixel rendering rounding errors in some browsers
        setShowLeftArrow(scrollLeft > 1);
        setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
    }, []);

    // Re-evaluate scroll position on mount, window resize, and when content (children) changes
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        checkScrollPosition();

        container.addEventListener('scroll', checkScrollPosition, {passive: true});
        window.addEventListener('resize', checkScrollPosition);

        return () => {
            container.removeEventListener('scroll', checkScrollPosition);
            window.removeEventListener('resize', checkScrollPosition);
        };
    }, [checkScrollPosition, children]);

    const handleScroll = (direction: 'left' | 'right') => {
        const container = scrollContainerRef.current;
        if (!container) return;

        // Scroll by 80% of the visible container width to maintain visual context
        const scrollAmount = container.clientWidth * 0.8;
        const targetScroll = direction === 'left'
            ? container.scrollLeft - scrollAmount
            : container.scrollLeft + scrollAmount;

        container.scrollTo({
            left: targetScroll,
            behavior: 'smooth'
        });
    };

    const arrowButtonClasses = "absolute top-1/2 z-10 -translate-y-1/2 p-2.5 rounded-full bg-slate-950/60 backdrop-blur-md border border-white/10 text-white/70 hover:bg-slate-800 hover:text-white transition-all duration-300 shadow-2xl transition-opacity opacity-0 group-hover/scroll:opacity-100 disabled:opacity-0 cursor-pointer";

    return (
        <div className={cn("relative group/scroll", className)}>
            {/* Left Navigation Arrow */}
            {showLeftArrow && (
                <button
                    onClick={() => handleScroll('left')}
                    className={cn(arrowButtonClasses, "left-2")}
                    aria-label="Scroll left"
                >
                    <ChevronLeft size={20} strokeWidth={2.5}/>
                </button>
            )}

            {/* Right Navigation Arrow */}
            {showRightArrow && (
                <button
                    onClick={() => handleScroll('right')}
                    className={cn(arrowButtonClasses, "right-2")}
                    aria-label="Scroll right"
                >
                    <ChevronRight size={20} strokeWidth={2.5}/>
                </button>
            )}

            {/* Scrollable Container Content */}
            <div
                ref={scrollContainerRef}
                className={cn(
                    "flex overflow-x-auto scroll-smooth scrollbar-none group-hover/scroll:custom-scrollbar snap-x snap-mandatory pb-4",
                    contentClassName
                )}
            >
                {children}
            </div>
        </div>
    );
};