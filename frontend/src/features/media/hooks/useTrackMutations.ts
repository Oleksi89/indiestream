import {useMutation, useQueryClient} from '@tanstack/react-query';
import {mediaApi, type UploadTrackPayload} from '../api/media.api';
import {trackKeys} from './useTrackQueries';
import {useUploadWizardStore} from './useUploadWizardStore';
import toast from 'react-hot-toast';
import type {AppealRequest, TrackResolutionRequest} from "@/features/media/types";
import {apiClient} from "@/shared/api/apiClient.ts";

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
};