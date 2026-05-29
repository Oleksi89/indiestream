import {apiClient} from '@/shared/api/apiClient';
import type {AuthResponse, LoginRequest, RegisterRequest, UserDto, UserPublicProfileDto} from "@/features/auth/types";
import type {AxiosResponse} from "axios";

export const authApi = {
    login: async (credentials: LoginRequest): Promise<AuthResponse> => {
        const {data} = await apiClient.post<unknown, AxiosResponse<AuthResponse>>(
            '/auth/login',
            credentials
        );
        return data;
    },

    register: async (credentials: RegisterRequest): Promise<UserDto> => {
        const {data} = await apiClient.post<unknown, AxiosResponse<UserDto>>(
            '/auth/register',
            credentials
        );
        return data;
    },

    logout: async (): Promise<void> => {
        await apiClient.post('/auth/logout');
    },

    /**
     * Executes a fast ILIKE query against the backend Auth module.
     * Hard-capped at 5 results by the backend to prevent layout thrashing.
     */
    searchUsersAutocomplete: async (query: string): Promise<UserPublicProfileDto[]> => {
        const {data} = await apiClient.get<unknown, AxiosResponse<UserPublicProfileDto[]>>('/users/autocomplete', {
            params: {q: query}
        });
        return data;
    }
};