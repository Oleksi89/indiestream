import {RegisterForm} from '@/features/auth/ui/RegisterForm';
import {useTranslation} from '@/shared/lib/i18n/useTranslation';

export const RegisterPage = () => {
    const {t} = useTranslation();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 px-4">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold text-white tracking-tight">{t.auth.register.pageTitle}</h1>
                <p className="text-slate-400 mt-2">{t.auth.register.pageSubtitle}</p>
            </div>
            <RegisterForm/>
        </div>
    );
};