import {useEffect, useState, useRef} from 'react';

interface UseInViewOptions extends IntersectionObserverInit {
    triggerOnce?: boolean;
}

/**
 * Hook for Lazy Loading / Intersection detection.
 * Efficiently defers rendering or API fetching until the element is near the viewport.
 */
export const useInView = ({triggerOnce = true, rootMargin = '300px', ...options}: UseInViewOptions = {}) => {
    const ref = useRef<HTMLDivElement | null>(null);
    const [isInView, setIsInView] = useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setIsInView(true);
                if (triggerOnce) {
                    observer.disconnect(); // Stop monitoring after the first load
                }
            } else if (!triggerOnce) {
                setIsInView(false);
            }
        }, {rootMargin, ...options});

        observer.observe(element);

        return () => observer.disconnect();
    }, [triggerOnce, rootMargin, options.threshold]);

    return {ref, isInView};
};