import React, {useState} from 'react';
import {ShieldAlert, Key, User as UserIcon, Globe, Loader2} from 'lucide-react';
import {useAuthStore} from '@/shared/store/authStore';
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

export const SettingsPage: React.FC = () => {
    const user = useAuthStore(state => state.user);
    const {mutate: resetTaste, isPending: isResetting} = useResetTasteProfileMutation();
    const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

    const handleTasteReset = () => {
        resetTaste(undefined, {
            onSuccess: () => setIsResetDialogOpen(false)
        });
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl space-y-10">
            <header className="border-b border-slate-800 pb-6">
                <h1 className="text-3xl font-bold tracking-tight text-white">Account Settings</h1>
                <p className="text-slate-400 mt-2">Manage your account preferences and algorithmic data.</p>
            </header>

            {/* Account Details Placeholder */}
            <section className="space-y-6">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <UserIcon className="text-violet-400" size={20}/> General Information
                </h2>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-400">Username</label>
                            <input
                                type="text"
                                disabled
                                value={user?.username || ''}
                                className="w-full bg-slate-950 border border-slate-800 rounded-md px-4 py-2 text-slate-300 opacity-70 cursor-not-allowed"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-400">Email Address</label>
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

            {/* Password Change Placeholder */}
            <section className="space-y-6">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Key className="text-violet-400" size={20}/> Security
                </h2>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                    <div className="space-y-4 max-w-md">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-400">Current Password</label>
                            <input type="password" placeholder="••••••••"
                                   className="w-full bg-slate-950 border border-slate-700 rounded-md px-4 py-2 text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all"/>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-400">New Password</label>
                            <input type="password" placeholder="••••••••"
                                   className="w-full bg-slate-950 border border-slate-700 rounded-md px-4 py-2 text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all"/>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-400">Confirm New Password</label>
                            <input type="password" placeholder="••••••••"
                                   className="w-full bg-slate-950 border border-slate-700 rounded-md px-4 py-2 text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all"/>
                        </div>
                        <button
                            className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-md transition-colors">
                            Update Password
                        </button>
                    </div>
                </div>
            </section>

            {/* Preferences Placeholder */}
            <section className="space-y-6">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Globe className="text-violet-400" size={20}/> Preferences
                </h2>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-white font-medium">Language</h3>
                            <p className="text-sm text-slate-400">Select your preferred interface language.</p>
                        </div>
                        <select
                            className="bg-slate-950 border border-slate-700 text-white text-sm rounded-md px-3 py-2 outline-none">
                            <option value="en">English (US)</option>
                            <option value="uk">Ukrainian (UKR)</option>
                            <option value="pl">Polish (PL)</option>
                        </select>
                    </div>
                </div>
            </section>

            {/* Danger Zone */}
            {user?.profile?.needsTasteCalibration === false && (
            <section className="space-y-6 pt-6 border-t border-slate-800">
                <h2 className="text-xl font-semibold text-red-400 flex items-center gap-2">
                    <ShieldAlert size={20}/> Danger Zone
                </h2>
                <div
                    className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-white font-medium">Reset AI Taste Algorithm</h3>
                        <p className="text-sm text-slate-400 mt-1 max-w-xl">
                            This will permanently delete your taste profile and clear your
                            blocklists.
                            Your recommendations will be reset to a "Cold Start" state. Your library and playlists will
                            remain unaffected.
                        </p>
                    </div>

                    <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                        <DialogTrigger asChild>
                            <button
                                className="shrink-0 px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white text-sm font-bold rounded-md transition-all border border-red-500/30">
                                Reset Profile
                            </button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Are you absolutely sure?</DialogTitle>
                                <DialogDescription>
                                    This action cannot be undone. This will permanently flush your AI vector data and
                                    recommendation history. You will be redirected to the onboarding flow to recalibrate
                                    your algorithm.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter className="mt-6">
                                <DialogClose asChild>
                                    <button
                                        className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                                        disabled={isResetting}>
                                        Cancel
                                    </button>
                                </DialogClose>
                                <button
                                    onClick={handleTasteReset}
                                    disabled={isResetting}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isResetting ? <Loader2 size={16} className="animate-spin"/> :
                                        <ShieldAlert size={16}/>}
                                    Yes, Reset Algorithm
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