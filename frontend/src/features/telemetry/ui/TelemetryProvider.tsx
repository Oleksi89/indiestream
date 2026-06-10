import React, {useEffect} from 'react';
import {usePlaybackTelemetry} from '../hooks/usePlaybackTelemetry';
import {useTelemetryStore} from '../store/telemetryStore';
import {getTelemetryWorker} from '../lib/workerManager';

/**
 * Global provider to instantiate the Telemetry Engine.
 * Should be mounted near the root of the React tree (e.g., inside App.tsx or Router).
 */
export const TelemetryProvider: React.FC<{ children: React.ReactNode }> = ({children}) => {
    // 1. Mount the Playback State Machine listener (Out of React Render Loop)
    usePlaybackTelemetry();

    useEffect(() => {
        // Initialize worker immediately on app boot
        const worker = getTelemetryWorker();

        const handleVisibilityChange = () => {
            // 'hidden' fires when switching tabs, minimizing browser, or closing the tab on mobile/desktop
            if (document.visibilityState === 'hidden') {
                // Instantly close the current listening time-range and commit to DB
                useTelemetryStore.getState().flushTelemetry(false);
                // Command worker to drain the queue.
                // Worker uses fetch with keepalive: true to survive tab closure.
                worker.postMessage({type: 'FLUSH_QUEUE'});
            }
        };

        const handleOnline = () => {
            // Network restored: flush any buffered IndexedDB payloads
            worker.postMessage({type: 'FLUSH_QUEUE'});
        };

        window.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('online', handleOnline);

        return () => {
            window.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('online', handleOnline);
        };
    }, []);

    return <>{children}</>;
};