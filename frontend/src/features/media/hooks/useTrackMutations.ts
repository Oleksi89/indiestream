import {useMutation, useQueryClient} from '@tanstack/react-query';

import {trackKeys} from './useTrackQueries';
import {useUploadWizardStore} from '../sub-features/upload/hooks/useUploadWizardStore.ts';
import toast from 'react-hot-toast';
import type {AppealRequest, TrackDto, TrackResolutionRequest} from "@/features/media/types";
import {apiClient} from "@/shared/api/apiClient.ts";
import type {PageResponse} from "@/features/auth/types";
import type {UpdateTrackPayload, UploadTrackPayload} from "@/features/media/api/media.api.ts";
import {mediaApi} from "@/features/media/api/media.api.ts";

export const useUploadTrack = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: Omit<UploadTrackPayload, 'onUploadProgress'>) => {
            return mediaApi.uploadTrack({
                ...payload,
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        useUploadWizardStore.getState().setProgress(percentCompleted);
                    }
                }
            });
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({queryKey: trackKeys.studio()});
            useUploadWizardStore.getState().setUploadedTrackId(data.id);
            useUploadWizardStore.getState().setStep('PROCESSING');
            useUploadWizardStore.getState().setUploadError(null);
            toast.success('Upload complete! Running server analysis...');
        },
        onError: (error: any) => {
            console.error("Upload Execution Error:", error);

            // RFC 7807 fallback mechanism
            const isServerError = error?.response?.status >= 500;
            const extractedMessage = error?.response?.data?.detail
                || error?.response?.data?.title
                || error.message;

            const finalMessage = isServerError
                ? 'System unavailable. Please check your connection or contact support if the issue persists.'
                : extractedMessage;

            useUploadWizardStore.getState().setUploadError(finalMessage);
        }
    });
};

export const useAcceptAiTags = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (trackId: string) => apiClient.post(`/tracks/${trackId}/resolution/accept-ai`),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: trackKeys.studio()});
            toast.success('Tags accepted! Track is now APPROVED.');
        },
        onError: () => toast.error('Failed to accept AI tags.')
    });
};

export const useProposeCustomTags = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({trackId, payload}: { trackId: string; payload: TrackResolutionRequest }) =>
            apiClient.post(`/tracks/${trackId}/resolution/propose-tags`, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: trackKeys.studio()});
            toast.success('Proposal submitted. Track is now IN_REVIEW.');
        },
        onError: () => toast.error('Failed to submit tag proposal.')
    });
};

export const useAppealBan = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({trackId, payload}: { trackId: string; payload: AppealRequest }) =>
            apiClient.post(`/tracks/${trackId}/resolution/appeal`, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: trackKeys.studio()});
            toast.success('Appeal submitted successfully to moderators.');
        },
        onError: (error: any) => {
            const message = error?.response?.data?.detail || 'Failed to submit appeal.';
            toast.error(message);
        }
    });
}


export const usePublishTrack = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (trackId: string) => mediaApi.publishTrack(trackId),
        onMutate: async (trackId) => {
            await queryClient.cancelQueries({queryKey: trackKeys.studio()});
            const previousStudio = queryClient.getQueryData<PageResponse<TrackDto>>(trackKeys.studio());

            if (previousStudio) {
                queryClient.setQueryData<PageResponse<TrackDto>>(trackKeys.studio(), {
                    ...previousStudio,
                    content: previousStudio.content.map(t =>
                        t.id === trackId ? {...t, status: 'PUBLISHED'} : t
                    )
                });
            }
            return {previousStudio};
        },
        onSuccess: () => toast.success('Track is now published and live!'),
        onError: (_err, _trackId, context) => {
            if (context?.previousStudio) {
                queryClient.setQueryData(trackKeys.studio(), context.previousStudio);
            }
            toast.error('Failed to publish track.');
        },
        onSettled: () => {
            queryClient.invalidateQueries({queryKey: trackKeys.studio()});
            queryClient.invalidateQueries({queryKey: trackKeys.all}); // Refresh global feeds
        }
    });
};

export const useToggleTrackVisibility = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({trackId}: { trackId: string, currentStatus: string }) => mediaApi.toggleVisibility(trackId),
        onMutate: async ({trackId, currentStatus}) => {
            await queryClient.cancelQueries({queryKey: trackKeys.studio()});
            const previousStudio = queryClient.getQueryData<PageResponse<TrackDto>>(trackKeys.studio());

            const nextStatus = currentStatus === 'HIDDEN' ? 'PUBLISHED' : 'HIDDEN';

            if (previousStudio) {
                queryClient.setQueryData<PageResponse<TrackDto>>(trackKeys.studio(), {
                    ...previousStudio,
                    content: previousStudio.content.map(t =>
                        t.id === trackId ? {...t, status: nextStatus as any} : t
                    )
                });
            }
            return {previousStudio, nextStatus};
        },
        onSuccess: (_data, _variables, context) => {
            toast.success(`Track is now ${context?.nextStatus === 'HIDDEN' ? 'hidden from public' : 'visible globally'}.`);
        },
        onError: (_err, _variables, context) => {
            if (context?.previousStudio) {
                queryClient.setQueryData(trackKeys.studio(), context.previousStudio);
            }
            toast.error('Failed to toggle visibility.');
        },
        onSettled: () => {
            queryClient.invalidateQueries({queryKey: trackKeys.studio()});
            queryClient.invalidateQueries({queryKey: trackKeys.all});
        }
    });
};

export const useArchiveTrack = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (trackId: string) => mediaApi.archiveTrack(trackId),
        onMutate: async (trackId) => {
            await queryClient.cancelQueries({queryKey: trackKeys.studio()});
            const previousStudio = queryClient.getQueryData<PageResponse<TrackDto>>(trackKeys.studio());

            if (previousStudio) {
                // Optimistically remove the track from the studio dashboard
                queryClient.setQueryData<PageResponse<TrackDto>>(trackKeys.studio(), {
                    ...previousStudio,
                    content: previousStudio.content.filter(t => t.id !== trackId)
                });
            }
            return {previousStudio};
        },
        onSuccess: () => toast.success('Track archived successfully.'),
        onError: (_err, _trackId, context) => {
            if (context?.previousStudio) {
                queryClient.setQueryData(trackKeys.studio(), context.previousStudio);
            }
            toast.error('Failed to archive track.');
        },
        onSettled: () => {
            queryClient.invalidateQueries({queryKey: trackKeys.studio()});
        }
    });
};

export const useUpdateTrackDetails = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({trackId, payload}: { trackId: string; payload: UpdateTrackPayload }) =>
            mediaApi.updateTrackDetails(trackId, payload),
        onSuccess: () => {
            toast.success('Track metadata updated successfully.');
            queryClient.invalidateQueries({queryKey: trackKeys.studio()});
        },
        onError: (error: any) => {
            const message = error?.response?.data?.detail || 'Failed to update metadata.';
            toast.error(message);
        }
    });
};