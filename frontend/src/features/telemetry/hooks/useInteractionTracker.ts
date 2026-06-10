import {useCallback} from 'react';
import {getTelemetryWorker} from '../lib/workerManager';
import type {InteractionType, TelemetrySourceType, UiSurface} from '../types';
import {generateSafeUUID} from "@/features/telemetry/store/telemetryStore.ts";

/**
 * Hook for UI components to dispatch user interaction telemetry.
 * Completely offloads work to the Web Worker to maintain 60FPS UI rendering.
 */
export const useInteractionTracker = () => {
    const trackInteraction = useCallback((
        targetId: string,
        interactionType: InteractionType,
        sourceType: TelemetrySourceType,
        uiSurface: UiSurface
    ) => {
        getTelemetryWorker().postMessage({
            type: 'ENQUEUE_INTERACTION',
            payload: {
                eventId: generateSafeUUID(),
                targetId,
                interactionType,
                sourceType,
                uiSurface
            }
        });
    }, []);

    return {trackInteraction};
};