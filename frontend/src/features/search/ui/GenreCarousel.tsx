import {useRef} from 'react';
import {SlidersHorizontal, ChevronLeft, ChevronRight} from 'lucide-react';
import {AVAILABLE_GENRES} from '@/features/media/types';
import {cn} from '@/shared/lib/utils';

interface GenreCarouselProps {
    activeGenre: string;
    onToggle: (genre: string) => void;
}

export const GenreCarousel = ({activeGenre, onToggle}: GenreCarouselProps) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const scrollAmount = direction === 'left' ? -300 : 300;
            scrollRef.current.scrollBy({left: scrollAmount, behavior: 'smooth'});
        }
    };

    return (
        <div className="relative group/carousel flex items-center h-15">
            {/* Label */}
            <div
                className="flex items-center gap-1.5 text-slate-500 shrink-0 pr-4 mr-2 border-r border-slate-800 h-full z-10 bg-slate-950/90 backdrop-blur">
                <SlidersHorizontal size={14}/>
                <span className="text-xs font-semibold uppercase tracking-wider">Genres</span>
            </div>

            {/* Scrollable Container */}
            <div className="relative flex-1 h-full overflow-hidden mask-fade-edges">
                <div
                    ref={scrollRef}
                    className="flex items-center h-full gap-2 overflow-x-auto scrollbar-hide scroll-smooth px-1"
                >
                    {AVAILABLE_GENRES.map((g) => (
                        <button
                            key={g}
                            onClick={() => onToggle(g)}
                            className={cn(
                                "shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border",
                                activeGenre === g
                                    ? "bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-900/20 scale-105"
                                    : "bg-slate-900/80 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-500 hover:text-white"
                            )}
                        >
                            {g}
                        </button>
                    ))}
                </div>
            </div>

            {/* Floating Navigation Controls */}
            <button
                onClick={() => scroll('left')}
                className="absolute left-[85px] top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-slate-800 text-white border border-slate-600 opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-slate-700 shadow-xl"
                aria-label="Scroll left"
            >
                <ChevronLeft size={16}/>
            </button>
            <button
                onClick={() => scroll('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-slate-800 text-white border border-slate-600 opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-slate-700 shadow-xl"
                aria-label="Scroll right"
            >
                <ChevronRight size={16}/>
            </button>
        </div>
    );
};