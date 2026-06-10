import {STORES, saveEvent, getPendingEvents, deleteEvents} from './storage';
import type {PlaybackTelemetryPayload, InteractionTelemetryPayload} from '../types';

console.log('[TELEMETRY DEBUG WORKER] Worker script has booted successfully in background thread!');

let apiUrl: string = 'http://localhost:8080/api/v1';
let authToken: string | null = null;
let isFlushing = false;

export type WorkerMessage =
    | { type: 'INIT'; payload: { apiUrl: string; token: string | null } }
    | { type: 'UPDATE_TOKEN'; payload: { token: string | null } }
    | { type: 'ENQUEUE_PLAYBACK'; payload: PlaybackTelemetryPayload }
    | { type: 'ENQUEUE_INTERACTION'; payload: InteractionTelemetryPayload }
    | { type: 'FLUSH_QUEUE' };

self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
    const message = event.data;
    console.log(`[TELEMETRY DEBUG WORKER] Message received: ${message.type}`);

    try {
        switch (message.type) {
            case 'INIT':
                apiUrl = message.payload.apiUrl;
                authToken = message.payload.token;
                console.log(`[TELEMETRY DEBUG WORKER] Initialized with API: ${apiUrl}`);
                break;

            case 'UPDATE_TOKEN':
                authToken = message.payload.token;
                break;

            case 'ENQUEUE_PLAYBACK':
                console.log('[TELEMETRY DEBUG WORKER] Triggering saveEvent for PLAYBACK...', message.payload);
                await saveEvent(STORES.PLAYBACK, message.payload);
                console.log('[TELEMETRY DEBUG WORKER] saveEvent SUCCESS. Triggering flushQueue...');
                await flushQueue();
                break;

            case 'ENQUEUE_INTERACTION':
                console.log('[TELEMETRY DEBUG WORKER] Triggering saveEvent for INTERACTION...', message.payload);
                await saveEvent(STORES.INTERACTION, message.payload);
                await flushQueue();
                break;

            case 'FLUSH_QUEUE':
                await flushQueue();
                break;
        }
    } catch (error) {
        console.error(`[TELEMETRY DEBUG WORKER] Error processing message ${message.type}:`, error);
    }
});

async function flushQueue() {
    if (isFlushing) {
        console.log('[TELEMETRY DEBUG WORKER] flushQueue skipped: Already flushing.');
        return;
    }
    isFlushing = true;

    try {
        await processStore(STORES.PLAYBACK, '/telemetry/playback');
        await processStore(STORES.INTERACTION, '/telemetry/interaction');
    } finally {
        isFlushing = false;
    }
}

async function processStore(storeName: typeof STORES[keyof typeof STORES], endpoint: string) {
    console.log(`[TELEMETRY DEBUG WORKER] Processing store: ${storeName}`);
    const events = await getPendingEvents<{ eventId: string }>(storeName);
    console.log(`[TELEMETRY DEBUG WORKER] Found ${events.length} pending events in ${storeName}`);

    if (events.length === 0) return;

    const successfulIds: string[] = [];

    for (const event of events) {
        try {
            const safeUUID = typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
                    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                });

            const headers: HeadersInit = {
                'Content-Type': 'application/json',
                'X-Trace-Id': safeUUID
            };

            if (authToken) {
                headers['Authorization'] = `Bearer ${authToken}`;
            }

            console.log(`[TELEMETRY DEBUG WORKER] Sending fetch request for event: ${event.eventId}`);
            const response = await fetch(`${apiUrl}${endpoint}`, {
                method: 'POST',
                headers,
                body: JSON.stringify(event),
                keepalive: true
            });

            console.log(`[TELEMETRY DEBUG WORKER] Network response status: ${response.status}`);

            if (response.ok || response.status === 202) {
                successfulIds.push(event.eventId);
            } else if (response.status === 429) {
                console.warn(`[Telemetry Worker] Rate limit reached.`);
                break;
            } else if (response.status >= 500) {
                console.warn(`[Telemetry Worker] Server error (${response.status}). Retrying later.`);
                break;
            } else if (response.status === 401 || response.status === 403) {
                console.error(`[Telemetry Worker] Unauthorized telemetry payload. Discarding.`);
                successfulIds.push(event.eventId);
            }

        } catch (error) {
            console.warn(`[TELEMETRY DEBUG WORKER] Network offline or fetch failed. Keeping event in DB. Error:`, error);
            break;
        }
    }

    if (successfulIds.length > 0) {
        console.log(`[TELEMETRY DEBUG WORKER] Deleting ${successfulIds.length} successfully sent events...`);
        await deleteEvents(storeName, successfulIds);
    }
}