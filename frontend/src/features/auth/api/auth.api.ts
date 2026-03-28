import { apiClient } from '@/shared/api/apiClient.ts';
import type {AuthResponse, LoginRequest} from "@/features/auth/types";
import type {AxiosResponse} from "axios";


export const authApi = {
    login: async (credentials: LoginRequest): Promise<AuthResponse> => {
        const { data } = await apiClient.post<unknown, AxiosResponse<AuthResponse>>(
            '/auth/login',
            credentials
        );
        return data;
    },
    // TODO: [Auth] - Implement register endpoint mapping
};