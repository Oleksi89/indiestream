import React from 'react';
import {ChevronRight} from 'lucide-react';
import {cn} from '@/shared/lib/utils';

interface CarouselShelfProps<T> {
    title: string;
    items: T[];
    renderItem: (item: T, index: number) => React.ReactNode;
    keyExtractor: (item: T) => string;
    onViewAll?: () => void;
    className?: string;
}

/**
 * Generic horizontal scrollable shelf enforcing FSD presentation boundaries.
 * Utilizes Tailwind CSS native scrollbar hiding and snap behaviors.
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
    if (!items || items.length === 0) return null;

    return (
        <section className={cn("flex flex-col space-y-4 mb-8", className)}>
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white tracking-tight">{title}</h2>
                {onViewAll && (
                    <button
                        onClick={onViewAll}
                        className="text-sm font-medium text-slate-400 hover:text-white flex items-center transition-colors group"
                    >
                        Show all
                        <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform"/>
                    </button>
                )}
            </div>

            <div
                className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-4 -mx-4 px-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {items.map((item, index) => (
                    <div
                        key={keyExtractor(item)}
                        className="snap-start shrink-0 w-[180px] sm:w-[200px] md:w-[240px]"
                    >
                        {renderItem(item, index)}
                    </div>
                ))}
            </div>
        </section>
    );
};