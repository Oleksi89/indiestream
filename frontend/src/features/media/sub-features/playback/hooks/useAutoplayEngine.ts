import {useEffect, useRef} from 'react';
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

    // useRef prevents race conditions and duplicate concurrent API calls reliably
    const isFetchingRef = useRef(false);

    // Subscribe only to the reactive dependencies needed to prevent unnecessary renders
    const queueLength = usePlayerStore(state => state.queue.length);
    const isAutoplayActive = usePlayerStore(state => state.isAutoplayActive);
    const autoplayMode = usePlayerStore(state => state.autoplayMode);
    const autoplayContextId = usePlayerStore(state => state.autoplayContextId);
    const repeatMode = usePlayerStore(state => state.repeatMode);
    const appendAutoplayTracks = usePlayerStore(state => state.appendAutoplayTracks);
    const setAutoplay = usePlayerStore(state => state.setAutoplay);

    // Threshold: Fetch when 2 or fewer tracks remain to guarantee zero AudioContext drops
    const THRESHOLD = 2;

    useEffect(() => {
        // Suspend engine if disabled, threshold not met, or native loop modes are active
        if (!isAutoplayActive || !autoplayMode || queueLength > THRESHOLD || repeatMode === 'CONTEXT' || repeatMode === 'TRACK') {
            return;
        }

        const fetchNextBatch = async () => {
            if (isFetchingRef.current) return;
            isFetchingRef.current = true;

            try {
                // Bypass cache imperatively. The backend Anti-Fatigue and Mathematical Jitter
                // dynamically change the vector result set on every request.
                const tracks = await queryClient.fetchQuery({
                    queryKey: ['recommendations', 'autoplay', autoplayMode, autoplayContextId, Date.now()],
                    queryFn: () => recommendationsApi.getAutoplayQueue(autoplayMode, autoplayContextId || undefined),
                    staleTime: 0,
                });

                if (tracks.length > 0) {
                    appendAutoplayTracks(tracks);
                } else {
                    // Backend Anti-Fatigue exhausted or absolute vector cold-start failure
                    toast.error("Autoplay exhausted. Discover more tracks to refresh your taste profile.", {icon: '🤖'});
                    setAutoplay(false, autoplayMode, autoplayContextId);
                }
            } catch (error) {
                console.error('Autoplay engine vector resolution failed:', error);
                toast.error("Failed to load AI recommendations.");
                setAutoplay(false, autoplayMode, autoplayContextId);
            } finally {
                isFetchingRef.current = false;
            }
        };

        fetchNextBatch();

    }, [queueLength, isAutoplayActive, autoplayMode, autoplayContextId, repeatMode, queryClient, appendAutoplayTracks, setAutoplay]);
};