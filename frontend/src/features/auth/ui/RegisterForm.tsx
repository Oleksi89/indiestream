import {type SubmitHandler, useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {useNavigate, Link} from 'react-router-dom';
import {type RegisterRequest, getRegisterSchema} from '../types';
import {authApi} from '../api/auth.api';
import {useState} from 'react';
import {isAxiosError} from "axios";
import {useTranslation} from '@/shared/lib/i18n/useTranslation.ts';

export const RegisterForm = () => {
    const navigate = useNavigate();
    const [serverError, setServerError] = useState<string | null>(null);
    const {t} = useTranslation();

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: {errors, isSubmitting},
    } = useForm<RegisterRequest>({
        resolver: zodResolver(getRegisterSchema(t)),
        defaultValues: {
            email: '',
            username: '',
            alias: '',
            password: '',
            confirmPassword: '',
            role: 'USER',
            agreedToRules: false as unknown as true,
        }
    });

    const selectedRole = watch('role');

    const onSubmit: SubmitHandler<RegisterRequest> = async (data) => {
        try {
            setServerError(null);
            await authApi.register(data);
            navigate('/login', {state: {message: t.auth.register.successMessage}});
        } catch (error: unknown) {
            if (isAxiosError(error)) {
                setServerError(error.response?.data?.detail || t.auth.register.errors.failed);
            } else {
                setServerError(t.auth.register.errors.unexpected);
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
                        className="p-3 bg-red-500/10 border border-red-500/50 rounded-md text-red-500 text-sm font-medium">
                        {serverError}
                    </div>
                )}

                {/* Role Switcher */}
                <div className="flex p-1 bg-slate-900/50 rounded-lg mb-6 border border-slate-700/50">
                    <button
                        type="button"
                        onClick={() => setValue('role', 'USER')}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                            selectedRole === 'USER'
                                ? 'bg-violet-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        {t.auth.register.roles.user}
                    </button>
                    <button
                        type="button"
                        onClick={() => setValue('role', 'ARTIST')}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                            selectedRole === 'ARTIST'
                                ? 'bg-violet-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        {t.auth.register.roles.artist}
                    </button>
                </div>

                <div>
                    <label htmlFor="register-email" className="block text-sm font-medium text-slate-300">
                        {t.auth.register.emailLabel}
                    </label>
                    <input
                        {...register('email')}
                        id="register-email"
                        type="email"
                        autoComplete="email"
                        aria-invalid={errors.email ? 'true' : 'false'}
                        aria-describedby={errors.email ? 'register-email-error' : undefined}
                        className="mt-1 block w-full rounded-md border-slate-700 bg-slate-800 text-slate-100 focus:border-violet-500 focus:ring-violet-500 px-3 py-2 outline-none transition-all"
                    />
                    {errors.email && (
                        <p id="register-email-error" role="alert" className="text-red-500 text-xs mt-1">
                            {errors.email.message}
                        </p>
                    )}
                </div>

                <div>
                    <label htmlFor="register-username" className="block text-sm font-medium text-slate-300">
                        {t.auth.register.usernameLabel}
                    </label>
                    <input
                        {...register('username')}
                        id="register-username"
                        type="text"
                        autoComplete="username"
                        placeholder={t.auth.register.usernamePlaceholder}
                        aria-invalid={errors.username ? 'true' : 'false'}
                        aria-describedby={errors.username ? 'register-username-error' : undefined}
                        className="mt-1 block w-full rounded-md border-slate-700 bg-slate-800 text-slate-100 focus:border-violet-500 focus:ring-violet-500 px-3 py-2 outline-none transition-all"
                    />
                    {errors.username && (
                        <p id="register-username-error" role="alert" className="text-red-500 text-xs mt-1">
                            {errors.username.message}
                        </p>
                    )}
                </div>

                <div>
                    <label htmlFor="register-alias" className="block text-sm font-medium text-slate-300">
                        {t.auth.register.aliasLabel}
                    </label>
                    <input
                        {...register('alias')}
                        id="register-alias"
                        type="text"
                        placeholder={t.auth.register.aliasPlaceholder}
                        aria-invalid={errors.alias ? 'true' : 'false'}
                        aria-describedby={errors.alias ? 'register-alias-error' : undefined}
                        className="mt-1 block w-full rounded-md border-slate-700 bg-slate-800 text-slate-100 focus:border-violet-500 focus:ring-violet-500 px-3 py-2 outline-none transition-all"
                    />
                    {errors.alias && (
                        <p id="register-alias-error" role="alert" className="text-red-500 text-xs mt-1">
                            {errors.alias.message}
                        </p>
                    )}
                </div>

                <div>
                    <label htmlFor="register-password" className="block text-sm font-medium text-slate-300">
                        {t.auth.register.passwordLabel}
                    </label>
                    <input
                        {...register('password')}
                        id="register-password"
                        type="password"
                        autoComplete="new-password"
                        aria-invalid={errors.password ? 'true' : 'false'}
                        aria-describedby={errors.password ? 'register-password-error' : undefined}
                        className="mt-1 block w-full rounded-md border-slate-700 bg-slate-800 text-slate-100 focus:border-violet-500 focus:ring-violet-500 px-3 py-2 outline-none transition-all"
                    />
                    {errors.password && (
                        <p id="register-password-error" role="alert" className="text-red-500 text-xs mt-1">
                            {errors.password.message}
                        </p>
                    )}
                </div>

                <div>
                    <label htmlFor="register-confirm-password" className="block text-sm font-medium text-slate-300">
                        {t.auth.register.confirmPasswordLabel}
                    </label>
                    <input
                        {...register('confirmPassword')}
                        id="register-confirm-password"
                        type="password"
                        autoComplete="new-password"
                        aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                        aria-describedby={errors.confirmPassword ? 'register-confirm-password-error' : undefined}
                        className="mt-1 block w-full rounded-md border-slate-700 bg-slate-800 text-slate-100 focus:border-violet-500 focus:ring-violet-500 px-3 py-2 outline-none transition-all"
                    />
                    {errors.confirmPassword && (
                        <p id="register-confirm-password-error" role="alert" className="text-red-500 text-xs mt-1">
                            {errors.confirmPassword.message}
                        </p>
                    )}
                </div>

                {/* Rules Agreement Checkbox */}
                <div className="flex items-start gap-3 mt-4">
                    <div className="flex items-center h-5">
                        <input
                            {...register('agreedToRules')}
                            id="rules-agreement"
                            type="checkbox"
                            aria-invalid={errors.agreedToRules ? 'true' : 'false'}
                            className="w-4 h-4 rounded border-slate-700 bg-slate-900/50 text-violet-600 focus:ring-violet-500 focus:ring-offset-slate-900 transition-colors cursor-pointer"
                        />
                    </div>
                    <div className="flex flex-col">
                        <label htmlFor="rules-agreement" className="text-sm text-slate-300 select-none cursor-pointer">
                            {t.auth.register.rules.prefix}{' '}
                            <Link to="/rules" target="_blank" rel="noopener noreferrer"
                                  className="text-violet-400 hover:text-violet-300 hover:underline underline-offset-2 transition-colors">
                                {t.auth.register.rules.link}
                            </Link>{' '}
                            {t.auth.register.rules.suffix} <span className="text-red-400">*</span>
                        </label>
                        {errors.agreedToRules && (
                            <p role="alert" className="text-red-500 text-xs mt-1">
                                {errors.agreedToRules.message}
                            </p>
                        )}
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    aria-busy={isSubmitting}
                    aria-label={t.auth.register.submit}
                    title={t.auth.register.submit}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 focus:ring-offset-slate-900 disabled:opacity-50 transition-colors"
                >
                    {isSubmitting
                        ? t.auth.register.submitting
                        : (selectedRole === 'ARTIST' ? t.auth.register.submitArtist : t.auth.register.submitUser)
                    }
                </button>
            </form>

            <p className="text-center text-sm text-slate-400">
                {t.auth.register.haveAccount}{' '}
                <Link to="/login" className="font-medium text-violet-400 hover:text-violet-300 transition-colors">
                    {t.auth.register.loginLink}
                </Link>
            </p>
        </div>
    );
};
