import {useMemo} from 'react';
import type {PlaylistDto} from '../types';

/**
 * Reusable RBAC utility hook for evaluating playlist-specific permissions.
 * Maps exact constraints enforced securely by PlaylistService.java.
 */
export const usePlaylistPermissions = (playlist?: PlaylistDto | null, currentUserId?: string | null) => {
    return useMemo(() => {
        if (!playlist || !currentUserId) {
            return {
                isOwner: false,
                isCollaborator: false,
                canEditMetadata: false,
                canAddTracks: false,
                canManageCollaborators: false
            };
        }

        const isOwner = playlist.ownerId === currentUserId;
        const isCollaborator = playlist.collaborators?.some(c => c.id === currentUserId) || false;

        return {
            isOwner,
            isCollaborator,
            // Modulith enforces that Collaborators can modify metadata/covers and add/remove tracks
            canEditMetadata: isOwner || isCollaborator,
            canAddTracks: isOwner || isCollaborator,
            // Only the absolute Owner can assign or remove arbitrary users.
            // A collaborator executing a DELETE /collaborators/{self} is handled by an isolated 'leave' flow.
            canManageCollaborators: isOwner
        };
    }, [playlist, currentUserId]);
};