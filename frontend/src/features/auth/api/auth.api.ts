import { apiClient } from '@/shared/api/apiClient.ts';
import type {AuthResponse, LoginRequest, RegisterRequest, UserDto} from "@/features/auth/types";
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
        const { data } = await apiClient.post<unknown, AxiosResponse<UserDto>>(
            '/auth/register',
            credentials
        );
        return data;
    },

    logout: async (): Promise<void> => {
        await apiClient.post('/auth/logout');
    }
};