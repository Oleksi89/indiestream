import { LoginForm } from '@/features/auth/ui/LoginForm.tsx';

export const LoginPage = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
            <div className="p-8 bg-slate-900 rounded-xl border border-slate-800 shadow-xl flex flex-col items-center">
                <h1 className="text-2xl font-bold text-slate-100 mb-6">IndieStream Login</h1>
                <LoginForm />
            </div>
        </div>
    );
};