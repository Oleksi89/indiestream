import React, {useState} from 'react';
import {useForm, type SubmitHandler} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {Eye, EyeOff, Loader2, CheckCircle2} from 'lucide-react';
import {isAxiosError} from 'axios';
import {useTranslation} from '@/shared/lib/i18n/useTranslation';
import {authApi} from '@/features/auth/api/auth.api';
import {getChangePasswordSchema, type ChangePasswordFormValues} from '@/features/auth/types';

export const ChangePasswordForm: React.FC = () => {
    const {t} = useTranslation();

    const [showPassword, setShowPassword] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<boolean>(false);

    const {
        register,
        handleSubmit,
        reset,
        formState: {errors, isSubmitting},
    } = useForm({
        resolver: zodResolver(getChangePasswordSchema(t)),
    });

    const onSubmit: SubmitHandler<ChangePasswordFormValues> = async (data) => {
        try {
            setServerError(null);
            setSuccessMessage(false);

            await authApi.changePassword({
                currentPassword: data.currentPassword,
                newPassword: data.newPassword,
            });

            setSuccessMessage(true);
            reset(); // Clear form after success
        } catch (error: unknown) {
            if (isAxiosError(error)) {
                setServerError(error.response?.data?.detail || t.common?.error || "Invalid current password.");
            } else {
                setServerError(t.auth?.login?.errors?.network || "Network error.");
            }
        }
    };

    const toggleVisibility = () => setShowPassword(prev => !prev);
    const inputType = showPassword ? "text" : "password";

    return (
        <form className="space-y-4 max-w-md" onSubmit={handleSubmit(onSubmit)}>
            {/* Hidden field for accessibility and password managers */}
            <input type="text" autoComplete="username" className="hidden" aria-hidden="true" tabIndex={-1}/>

            {serverError && (
                <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-md text-red-500 text-sm font-medium">
                    {serverError}
                </div>
            )}

            {successMessage && (
                <div
                    className="p-3 bg-green-500/10 border border-green-500/50 rounded-md text-green-500 text-sm font-medium flex items-center gap-2">
                    <CheckCircle2 size={16}/> {t.settings?.security?.success || "Password updated successfully!"}
                </div>
            )}

            <div className="space-y-2 relative">
                <label className="text-sm font-medium text-slate-400">{t.settings?.security?.currentPassword}</label>
                <div className="relative">
                    <input
                        {...register('currentPassword')}
                        type={inputType}
                        autoComplete="current-password"
                        className="w-full bg-slate-950 border border-slate-700 rounded-md px-4 py-2 pr-10 text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all"
                    />
                    <button type="button" onClick={toggleVisibility}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                            tabIndex={-1}>
                        {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                    </button>
                </div>
                {errors.currentPassword &&
                    <p className="text-red-500 text-xs mt-1">{errors.currentPassword.message}</p>}
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">{t.settings?.security?.newPassword}</label>
                <div className="relative">
                    <input
                        {...register('newPassword')}
                        type={inputType}
                        autoComplete="new-password"
                        className="w-full bg-slate-950 border border-slate-700 rounded-md px-4 py-2 pr-10 text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all"
                    />
                    {/* One visibility button for all form fields */}
                </div>
                {errors.newPassword && <p className="text-red-500 text-xs mt-1">{errors.newPassword.message}</p>}
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">{t.settings?.security?.confirmPassword}</label>
                <div className="relative">
                    <input
                        {...register('confirmPassword')}
                        type={inputType}
                        autoComplete="new-password"
                        className="w-full bg-slate-950 border border-slate-700 rounded-md px-4 py-2 pr-10 text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all"
                    />
                </div>
                {errors.confirmPassword &&
                    <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
            </div>

            <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 flex items-center justify-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50"
            >
                {isSubmitting ? <Loader2 size={16} className="animate-spin mr-2"/> : null}
                {t.settings?.security?.updatePassword || "Update Password"}
            </button>
        </form>
    );
};