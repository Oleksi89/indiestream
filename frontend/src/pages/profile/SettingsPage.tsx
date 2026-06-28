import React, {useState} from 'react';
import {ShieldAlert, Key, User as UserIcon, Globe, Loader2} from 'lucide-react';
import {useAuthStore} from '@/shared/store/authStore';
import {useLocaleStore} from '@/shared/store/localeStore';
import {useTranslation} from '@/shared/lib/i18n/useTranslation';
import {SUPPORTED_LOCALES, isSupportedLocale} from '@/shared/lib/i18n/i18n';
import {useResetTasteProfileMutation} from '@/features/recommendations/hooks/useRecommendationMutations';
import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from '@/shared/ui/Dialog';
import {ChangePasswordForm} from "@/features/auth/ui/ChangePasswordForm.tsx";

export const SettingsPage: React.FC = () => {
    const user = useAuthStore(state => state.user);
    const {t} = useTranslation();
    const locale = useLocaleStore(state => state.locale);
    const setLocale = useLocaleStore(state => state.setLocale);
    const {mutate: resetTaste, isPending: isResetting} = useResetTasteProfileMutation();
    const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

    const handleTasteReset = () => {
        resetTaste(undefined, {
            onSuccess: () => setIsResetDialogOpen(false)
        });
    };

    const handleLocaleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const {value} = event.target;
        if (isSupportedLocale(value)) {
            setLocale(value);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl space-y-10">
            <header className="border-b border-slate-800 pb-6">
                <h1 className="text-3xl font-bold tracking-tight text-white">{t.settings.title}</h1>
                <p className="text-slate-400 mt-2">{t.settings.subtitle}</p>
            </header>

            {/* Account Details Placeholder */}
            <section className="space-y-6">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <UserIcon className="text-violet-400" size={20}/> {t.settings.general.heading}
                </h2>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-400">{t.settings.general.username}</label>
                            <input
                                type="text"
                                disabled
                                value={user?.username || ''}
                                className="w-full bg-slate-950 border border-slate-800 rounded-md px-4 py-2 text-slate-300 opacity-70 cursor-not-allowed"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-400">{t.settings.general.email}</label>
                            <input
                                type="email"
                                disabled
                                value={user?.email || ''}
                                className="w-full bg-slate-950 border border-slate-800 rounded-md px-4 py-2 text-slate-300 opacity-70 cursor-not-allowed"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Password Change Section */}
            <section className="space-y-6">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Key className="text-violet-400" size={20}/> {t.settings.security.heading}
                </h2>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                    <ChangePasswordForm/>
                </div>
            </section>

            {/* Preferences Placeholder */}
            <section className="space-y-6">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Globe className="text-violet-400" size={20}/> {t.settings.preferences.heading}
                </h2>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <label htmlFor="locale-select" className="text-white font-medium">
                                {t.settings.preferences.language.title}
                            </label>
                            <p className="text-sm text-slate-400">{t.settings.preferences.language.description}</p>
                        </div>
                        <select
                            id="locale-select"
                            value={locale}
                            onChange={handleLocaleChange}
                            className="bg-slate-950 border border-slate-700 text-white text-sm rounded-md px-3 py-2 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all">
                            {SUPPORTED_LOCALES.map(option => (
                                <option key={option.code} value={option.code}>{option.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </section>

            {/* Danger Zone */}
            {user?.profile?.needsTasteCalibration === false && (
                <section className="space-y-6 pt-6 border-t border-slate-800">
                    <h2 className="text-xl font-semibold text-red-400 flex items-center gap-2">
                        <ShieldAlert size={20}/> {t.settings.dangerZone.heading}
                    </h2>
                    <div
                        className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-white font-medium">{t.settings.dangerZone.resetTaste.title}</h3>
                        <p className="text-sm text-slate-400 mt-1 max-w-xl">
                            {t.settings.dangerZone.resetTaste.description}
                        </p>
                    </div>

                    <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                        <DialogTrigger asChild>
                            <button
                                className="shrink-0 px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white text-sm font-bold rounded-md transition-all border border-red-500/30">
                                {t.settings.dangerZone.resetTaste.trigger}
                            </button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{t.settings.dangerZone.resetTaste.confirmTitle}</DialogTitle>
                                <DialogDescription>
                                    {t.settings.dangerZone.resetTaste.confirmDescription}
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter className="mt-6">
                                <DialogClose asChild>
                                    <button
                                        className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                                        disabled={isResetting}>
                                        {t.common.cancel}
                                    </button>
                                </DialogClose>
                                <button
                                    onClick={handleTasteReset}
                                    disabled={isResetting}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isResetting ? <Loader2 size={16} className="animate-spin"/> :
                                        <ShieldAlert size={16}/>}
                                    {t.settings.dangerZone.resetTaste.submit}
                                </button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </section>
            )}
        </div>
    );
};