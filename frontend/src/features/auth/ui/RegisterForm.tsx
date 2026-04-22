import {type SubmitHandler, useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {useNavigate, Link} from 'react-router-dom';
import {registerSchema, type RegisterRequest} from '../types';
import {authApi} from '../api/auth.api';
import {useState} from 'react';
import {isAxiosError} from "axios";

export const RegisterForm = () => {
    const navigate = useNavigate();
    const [serverError, setServerError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: {errors, isSubmitting},
    } = useForm({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            email: '',
            password: '',
            confirmPassword: '',
        }
    });

    const onSubmit: SubmitHandler<RegisterRequest> = async (data) => {
        try {
            setServerError(null);
            await authApi.register(data);
            navigate('/login', {state: {message: 'Account created successfully. Please log in.'}});
        } catch (error: unknown) {
            if (isAxiosError(error)) {
                setServerError(error.response?.data?.detail || 'Registration failed. Please try again.');
            } else {
                setServerError('An unexpected error occurred.');
            }
        }
    };

    return (
        <div className="w-full max-w-sm space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {serverError && (
                    <div
                        className="p-3 bg-red-500/10 border border-red-500/50 rounded-md text-red-500 text-sm font-medium">
                        {serverError}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-slate-300">Email</label>
                    <input
                        {...register('email')}
                        type="email"
                        autoComplete="email"
                        className="mt-1 block w-full rounded-md border-slate-700 bg-slate-800 text-slate-100 focus:border-violet-500 focus:ring-violet-500 px-3 py-2 outline-none transition-all"
                    />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300">Password</label>
                    <input
                        {...register('password')}
                        type="password"
                        autoComplete="new-password"
                        className="mt-1 block w-full rounded-md border-slate-700 bg-slate-800 text-slate-100 focus:border-violet-500 focus:ring-violet-500 px-3 py-2 outline-none transition-all"
                    />
                    {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300">Confirm Password</label>
                    <input
                        {...register('confirmPassword')}
                        type="password"
                        autoComplete="new-password"
                        className="mt-1 block w-full rounded-md border-slate-700 bg-slate-800 text-slate-100 focus:border-violet-500 focus:ring-violet-500 px-3 py-2 outline-none transition-all"
                    />
                    {errors.confirmPassword && (
                        <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 focus:ring-offset-slate-900 disabled:opacity-50 transition-colors"
                >
                    {isSubmitting ? 'Creating account...' : 'Create Account'}
                </button>
            </form>

            <p className="text-center text-sm text-slate-400">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-violet-400 hover:text-violet-300 transition-colors">
                    Sign In
                </Link>
            </p>
        </div>
    );
};