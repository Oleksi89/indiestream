import { type SubmitHandler, useForm} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { loginSchema, type LoginRequest } from '../types';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '@/shared/store/authStore';
import { useState } from 'react';
import {isAxiosError} from "axios";

export const LoginForm = () => {
    const navigate = useNavigate();
    const setToken = useAuthStore((state) => state.setToken);
    const [serverError, setServerError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit: SubmitHandler<LoginRequest> = async (data) => {
        try {
            setServerError(null);
            const response = await authApi.login(data);
            setToken(response.token);
            navigate('/'); // Redirect to dashboard/player on success
        } catch (error: unknown) {
            if (isAxiosError(error)) {
                setServerError(error.response?.data?.detail || 'Invalid credentials');
            } else {
                setServerError('An unexpected error occurred.');
            }
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 w-full max-w-sm">
            {serverError && <div className="text-red-500 text-sm font-medium">{serverError}</div>}

            <div>
                <label className="block text-sm font-medium text-slate-300">Email</label>
                <input
                    {...register('email')}
                    type="email"
                    className="mt-1 block w-full rounded-md border-slate-700 bg-slate-800 text-slate-100 focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2"
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-300">Password</label>
                <input
                    {...register('password')}
                    type="password"
                    className="mt-1 block w-full rounded-md border-slate-700 bg-slate-800 text-slate-100 focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2"
                />
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
                {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
        </form>
    );
};