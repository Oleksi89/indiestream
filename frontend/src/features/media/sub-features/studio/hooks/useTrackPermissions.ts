import type {TrackStatus} from '../../../types';

export interface TrackPermissions {
    canPublish: boolean;
    // canEditMetadata: boolean;
    canHide: boolean;
    canUnhide: boolean;
    canArchive: boolean;
    isProcessing: boolean;
    isModerationLocked: boolean;
}

/**
 * Derives allowed user actions based on the track's FSM state.
 * Centralizes business rules to prevent logic leakage into UI components.
 */
export const useTrackPermissions = (status: TrackStatus): TrackPermissions => {
    // Volatile states where the backend or AI is actively mutating the aggregate
    const isProcessing = ['PROCESSING', 'AI_ANALYSIS'].includes(status);

    // States where the track is under human administrative review
    const isModerationLocked = status === 'IN_REVIEW';

    return {
        // Can only publish if fully approved by AI/Admin or legacy READY state
        canPublish: ['APPROVED', 'READY'].includes(status),

        // Can edit if it's a draft, needs artist revision, or already approved (but not yet published)
        // canEditMetadata: ['DRAFT', 'APPROVED', 'READY', 'NEEDS_REVISION'].includes(status),

        // Visibility toggles
        canHide: status === 'PUBLISHED',
        canUnhide: status === 'HIDDEN',

        // Archiving (Soft Delete) is allowed from almost anywhere EXCEPT when published or processing
        canArchive: ['DRAFT', 'REJECTED', 'BANNED', 'HIDDEN', 'APPROVED', 'READY', 'NEEDS_REVISION', 'FAILED'].includes(status),

        isProcessing,
        isModerationLocked,
    };
};