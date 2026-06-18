import React from 'react';
import {ChevronRight} from 'lucide-react';
import {cn} from '@/shared/lib/utils';
import {useTranslation} from "@/shared/lib/i18n/useTranslation";
import {HorizontalScrollArea} from '@/shared/ui/HorizontalScrollArea';
import {useInView} from '@/shared/hooks/useInView';

interface CarouselShelfProps<T> {
    title: string;
    items: T[];
    renderItem: (item: T, index: number) => React.ReactNode;
    keyExtractor: (item: T) => string;
    onViewAll?: () => void;
    className?: string;
}

/**
 * Generic horizontal scrollable shelf enforcing
 * Implements lazy rendering (Intersection Observer) to defer heavy DOM paints until near viewport.
 */
export const CarouselShelf = <T, >(
    {
        title,
        items,
        renderItem,
        keyExtractor,
        onViewAll,
        className
    }: CarouselShelfProps<T>) => {
    const {t} = useTranslation();

    const {ref, isInView} = useInView({rootMargin: '300px'});

    if (!items || items.length === 0) return null;

    return (
        <section ref={ref} className={cn("flex flex-col space-y-4 mb-8 min-h-[250px]", className)}>
            {/* Header Section */}
            <div className="flex items-center justify-between px-1">
                <h2 className="text-2xl font-bold text-white tracking-tight">{title}</h2>
                {onViewAll && (
                    <button
                        onClick={onViewAll}
                        className="text-sm font-medium text-slate-400 hover:text-white flex items-center transition-colors group"
                    >
                        {t.dashboard.showAll}
                        <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform"/>
                    </button>
                )}
            </div>

            {/* Lazy Rendered Body Section */}
            {isInView ? (
                <HorizontalScrollArea contentClassName="gap-6 -mx-4 px-4 -mb-4">
                    {items.map((item, index) => (
                        <div
                            key={keyExtractor(item)}
                            className="snap-start shrink-0 w-[180px] sm:w-[200px] md:w-[240px]"
                        >
                            {renderItem(item, index)}
                        </div>
                    ))}
                </HorizontalScrollArea>
            ) : (
                // Lightweight skeleton placeholder to prevent layout shifts
                <div className="flex gap-6 overflow-hidden -mx-4 px-4 pb-4">
                    {[...Array(4)].map((_, i) => (
                        <div
                            key={i}
                            className="shrink-0 w-[180px] sm:w-[200px] md:w-[240px] aspect-square bg-slate-800/20 rounded-xl animate-pulse"
                        />
                    ))}
                </div>
            )}
        </section>
    );
};