import {useEffect, useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {usePlayerStore} from '@/shared/store/playerStore';
import {recommendationsApi} from '@/features/recommendations/api/recommendations.api';
import toast from 'react-hot-toast';

/**
 * Orchestrates the AI Continuous Playback state machine.
 * Strictly bridges Client State (Zustand queue) with Server State (TanStack Query pgvector calls).
 */
export const useAutoplayEngine = () => {
    const queryClient = useQueryClient();
    const [isFetching, setIsFetching] = useState(false);

    // Subscribe only to the reactive dependencies needed to prevent unnecessary renders
    const queueLength = usePlayerStore(state => state.queue.length);
    const isAutoplayActive = usePlayerStore(state => state.isAutoplayActive);
    const autoplayMode = usePlayerStore(state => state.autoplayMode);
    const autoplayContextId = usePlayerStore(state => state.autoplayContextId);
    const appendAutoplayTracks = usePlayerStore(state => state.appendAutoplayTracks);
    const setAutoplay = usePlayerStore(state => state.setAutoplay);

    // Threshold: Fetch when 2 or fewer tracks remain to guarantee zero AudioContext drops
    const THRESHOLD = 2;

    useEffect(() => {
        let isMounted = true;

        const fetchNextBatch = async () => {
            if (!isAutoplayActive || !autoplayMode || queueLength > THRESHOLD || isFetching) {
                return;
            }

            setIsFetching(true);
            try {
                // We use fetchQuery imperatively to bypass standard caching mechanisms.
                // The backend Anti-Fatigue filter dynamically changes the mathematical result set.
                const tracks = await queryClient.fetchQuery({
                    queryKey: ['recommendations', 'autoplay', autoplayMode, autoplayContextId, Date.now()],
                    queryFn: () => recommendationsApi.getAutoplayQueue(autoplayMode, autoplayContextId || undefined),
                    staleTime: 0, // Always bypass cache
                });

                if (isMounted && tracks.length > 0) {
                    appendAutoplayTracks(tracks);
                } else if (isMounted && tracks.length === 0) {
                    // Backend Anti-Fatigue exhausted or cold-start failure
                    toast.error("Autoplay exhausted. Discover more tracks to refresh your taste profile.", {icon: '🤖'});
                    setAutoplay(false, autoplayMode, autoplayContextId);
                }
            } catch (error) {
                console.error('Autoplay engine vector resolution failed:', error);
                if (isMounted) {
                    toast.error("Failed to load AI recommendations.");
                    setAutoplay(false, autoplayMode, autoplayContextId);
                }
            } finally {
                if (isMounted) setIsFetching(false);
            }
        };

        fetchNextBatch();

        return () => {
            isMounted = false;
        };
    }, [queueLength, isAutoplayActive, autoplayMode, autoplayContextId, isFetching, queryClient, appendAutoplayTracks, setAutoplay]);
};