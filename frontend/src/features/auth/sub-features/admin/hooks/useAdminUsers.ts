import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {adminUsersApi} from '../api/admin-users.api';
import type {AdminUserFilters} from '../../../types';

export const ADMIN_USERS_QUERY_KEY = ['admin-users'];

export const useAdminUsers = (filters: AdminUserFilters) => {
    return useQuery({
        queryKey: [...ADMIN_USERS_QUERY_KEY, filters],
        queryFn: () => adminUsersApi.searchUsers(filters),
        placeholderData: (previousData) => previousData, // Для плавної пагінації
    });
};

export const useAdminBanUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({userId, reason}: { userId: string; reason: string }) =>
            adminUsersApi.banUser(userId, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ADMIN_USERS_QUERY_KEY});
        },
    });
};

export const useAdminUnbanUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({userId, reason}: { userId: string; reason: string }) =>
            adminUsersApi.unbanUser(userId, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ADMIN_USERS_QUERY_KEY});
        },
    });
};