import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';
import toast from "react-hot-toast";

export const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor: Inject JWT and Trace ID
apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = useAuthStore.getState().token;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        // Trace ID for observability
        config.headers.set('X-Trace-Id', crypto.randomUUID());
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor: Global error handling
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // In case if token is rejected or user is banned in Redis
            useAuthStore.getState().logout();

            // Prevent toast spam if already on the login page
            if (window.location.pathname !== '/login') {
                toast.error('Session expired or account suspended.');
                window.location.href = '/login'; // Force hard redirect to clear all memory states
            }
        }
        return Promise.reject(error);
    }
);