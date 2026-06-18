import { type SubmitHandler, useForm} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { type LoginRequest, getLoginSchema} from '../types';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '@/shared/store/authStore';
import { useState } from 'react';
import {isAxiosError} from "axios";
import {useTranslation} from '@/shared/lib/i18n/useTranslation.ts';

export const LoginForm = () => {
    const navigate = useNavigate();
    const setToken = useAuthStore((state) => state.setToken);
    const [serverError, setServerError] = useState<string | null>(null);
    const {t} = useTranslation();

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(getLoginSchema(t)),
    });

    const onSubmit: SubmitHandler<LoginRequest> = async (data) => {
        try {
            setServerError(null);
            const response = await authApi.login(data);
            setToken(response.token);
            navigate('/');
        } catch (error: unknown) {
            if (isAxiosError(error)) {
                // RFC 7807 ProblemDetail standard expects 'detail' field
                setServerError(error.response?.data?.detail || t.auth.login.errors.invalidCredentials);
            } else {
                setServerError(t.auth.login.errors.network);
            }
        }
    };

    return (
        <div className="w-full max-w-sm space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {serverError && (
                    <div
                        role="alert"
                        aria-live="assertive"
                        className="p-3 bg-red-500/10 border border-red-500/50 rounded-md text-red-500 text-sm font-medium"
                    >
                        {serverError}
                    </div>
                )}

                <div>
                    <label htmlFor="login-email" className="block text-sm font-medium text-slate-300">
                        {t.auth.login.emailLabel}
                    </label>
                    <input
                        {...register('email')}
                        id="login-email"
                        type="email"
                        autoComplete="email"
                        aria-invalid={errors.email ? 'true' : 'false'}
                        aria-describedby={errors.email ? 'login-email-error' : undefined}
                        className="mt-1 block w-full rounded-md border-slate-700 bg-slate-800 text-slate-100 focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2 outline-none transition-colors"
                    />
                    {errors.email && (
                        <p id="login-email-error" role="alert" className="text-red-500 text-xs mt-1">
                            {errors.email.message}
                        </p>
                    )}
                </div>

                <div>
                    <label htmlFor="login-password" className="block text-sm font-medium text-slate-300">
                        {t.auth.login.passwordLabel}
                    </label>
                    <input
                        {...register('password')}
                        id="login-password"
                        type="password"
                        autoComplete="current-password"
                        aria-invalid={errors.password ? 'true' : 'false'}
                        aria-describedby={errors.password ? 'login-password-error' : undefined}
                        className="mt-1 block w-full rounded-md border-slate-700 bg-slate-800 text-slate-100 focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2 outline-none transition-colors"
                    />
                    {errors.password && (
                        <p id="login-password-error" role="alert" className="text-red-500 text-xs mt-1">
                            {errors.password.message}
                        </p>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    aria-busy={isSubmitting}
                    aria-label={t.auth.login.submit}
                    title={t.auth.login.submit}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-slate-900 disabled:opacity-50 transition-colors"
                >
                    {isSubmitting ? t.auth.login.submitting : t.auth.login.submit}
                </button>
            </form>

            <p className="text-center text-sm text-slate-400">
                {t.auth.login.noAccount}{' '}
                <Link to="/register" className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
                    {t.auth.login.registerLink}
                </Link>
            </p>
        </div>
    );
};
