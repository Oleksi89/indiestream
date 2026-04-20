import {RegisterForm} from '@/features/auth/ui/RegisterForm';

export const RegisterPage = () => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 px-4">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold text-white tracking-tight">Join IndieStream</h1>
                <p className="text-slate-400 mt-2">Create an account to start streaming independent music.</p>
            </div>
            <RegisterForm/>
        </div>
    );
};