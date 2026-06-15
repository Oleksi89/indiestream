import React from "react";

/**
 * Zero-CLS skeleton loading state for horizontal media carousels.
 */
export const CarouselShelfSkeleton: React.FC = () => {
    return (
        <section className="flex flex-col space-y-4 animate-pulse mb-8">
            <div className="flex items-center justify-between">
                <div className="h-8 w-48 bg-slate-800 rounded-md"></div>
                <div className="h-4 w-16 bg-slate-800 rounded-md"></div>
            </div>

            <div className="flex overflow-hidden gap-6 pb-4 -mx-4 px-4">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="shrink-0 w-[200px] md:w-[240px] flex flex-col gap-3">
                        <div className="aspect-square w-full bg-slate-800 rounded-xl"></div>
                        <div className="flex flex-col gap-2 p-1">
                            <div className="h-5 w-3/4 bg-slate-800 rounded"></div>
                            <div className="h-3 w-1/2 bg-slate-800 rounded"></div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};