import {useState, useEffect} from 'react';
import {FastAverageColor} from 'fast-average-color';

// Extraction Engine for Tailwind UI Gradients
export const usePlaylistColor = (coverUrl: string | null | undefined, fallback: string = '#1e293b') => {
    const [dominantColor, setDominantColor] = useState<string>(fallback);

    useEffect(() => {
        if (!coverUrl) {
            queueMicrotask(() => setDominantColor(fallback));
            return;
        }

        const fac = new FastAverageColor();
        fac.getColorAsync(coverUrl, {algorithm: 'dominant'})
            .then(color => setDominantColor(color.hex))
            .catch(e => console.error('Color extraction failed', e));

        return () => fac.destroy();
    }, [coverUrl, fallback]);

    return dominantColor;
};