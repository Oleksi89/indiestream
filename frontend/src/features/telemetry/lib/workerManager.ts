import {useAuthStore} from '@/shared/store/authStore';

/**
 * Singleton manager for the background Telemetry Web Worker.
 * Handles continuous JWT token sync from local stores directly into the worker thread.
 */

let workerInstance: Worker | null = null;

export const getTelemetryWorker = (): Worker => {
    if (!workerInstance && typeof window !== 'undefined') {
        workerInstance = new Worker(
            new URL('./telemetry.worker.ts', import.meta.url),
            {type: 'module'}
        );

        const token = useAuthStore.getState().token;
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

        // Initial handshake
        workerInstance.postMessage({
            type: 'INIT',
            payload: {apiUrl, token}
        });

        // Dynamic context synchronization on auth changes
        useAuthStore.subscribe((state) => {
            workerInstance?.postMessage({
                type: 'UPDATE_TOKEN',
                payload: {token: state.token}
            });
        });
    }
    return workerInstance!;
};