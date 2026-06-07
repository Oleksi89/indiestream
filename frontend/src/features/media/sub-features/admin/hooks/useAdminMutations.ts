import {useMutation, useQueryClient} from '@tanstack/react-query';
import {adminApi} from '../api/admin.api';
import {adminKeys} from './useAdminQueries';
import toast from 'react-hot-toast';
import type {ModerationVerdictRequest} from '../../../types';

export const useExecuteVerdict = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({trackId, payload}: { trackId: string; payload: ModerationVerdictRequest }) =>
            adminApi.executeVerdict(trackId, payload),
        onSuccess: (_, variables) => {
            toast.success(`Verdict ${variables.payload.verdict} executed successfully.`);
            queryClient.invalidateQueries({queryKey: adminKeys.all});
        },
        onError: (error: any) => {
            const msg = error?.response?.data?.detail || 'Failed to execute verdict.';
            toast.error(msg);
        }
    });
};

export const useBanArtist = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({artistId, reason}: { artistId: string; reason: string }) =>
            adminApi.banArtist(artistId, reason),
        onSuccess: () => {
            toast.success('Artist globally suspended.');
            queryClient.invalidateQueries({queryKey: adminKeys.all});
        },
        onError: (error: any) => {
            const msg = error?.response?.data?.detail || 'Failed to ban artist.';
            toast.error(msg);
        }
    });
};


export const useUnbanArtist = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({artistId, reason}: {
            artistId: string;
            reason: string
        }) => adminApi.unbanArtist(artistId, reason),
        onSuccess: () => {
            toast.success('Artist account has been successfully unbanned.');
            queryClient.invalidateQueries({queryKey: ['admin']});
        },
        onError: () => toast.error('Failed to unban artist account.')
    });
};