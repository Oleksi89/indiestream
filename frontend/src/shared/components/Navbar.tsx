import {useState, useRef, useEffect, useCallback} from 'react';
import {useNavigate, Link} from 'react-router-dom';
import {useAuthStore} from '@/shared/store/authStore';
import {authApi} from '@/features/auth/api/auth.api';
import {User, Settings, LogOut, CreditCard, ChevronDown, Music} from 'lucide-react';
import {apiClient} from "@/shared/api/apiClient";
import type {UserDto} from "@/features/auth/types";

export const Navbar = () => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const {token, user, setUser, logout: logoutStore} = useAuthStore();

    // Fetch profile if we have a token but no user data in state
    const fetchProfile = useCallback(async () => {
        if (!token || user) return;
        try {
            const {data} = await apiClient.get<UserDto>('/users/me');
            setUser(data);
        } catch (error) {
            console.error('Failed to sync profile', error);
            // If profile fetch fails with 401, interceptor will trigger logoutStore()
        }
    }, [token, user, setUser]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const handleLogout = async () => {
        try {
            await authApi.logout();
        } catch (error) {
            // even if backend fails (e.g., token already expired),
            // clear local session.
            console.error('Logout sync failed', error);
        } finally {
            logoutStore();
            navigate('/login');
        }
    };


    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <nav className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
            <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-6">
                <div className="flex items-center gap-8">
                    <Link to="/" className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-slate-900/50 shadow-lg shadow-violet-500/20"/>
                        <span className="text-xl font-bold tracking-tight text-white">IndieStream</span>
                    </Link>
                </div>

                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="group flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/50 p-1 pr-3 transition-all hover:border-violet-500/50"
                    >
                        <div
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-violet-400">
                            <User size={18}/>
                        </div>
                        <div className="flex flex-col items-start leading-none">
                            <span className="text-xs font-medium text-slate-400">Account</span>
                            <span className="text-sm font-semibold text-white max-w-[120px] truncate">
                                {user?.alias || 'Loading...'}
                            </span>
                        </div>
                        <ChevronDown size={14} className="text-slate-500"/>
                    </button>

                    {isDropdownOpen && (
                        <div
                            className="absolute right-0 mt-2 w-64 origin-top-right rounded-xl border border-slate-800 bg-slate-900 p-2 shadow-2xl ring-1 ring-violet-500/10">
                            <div className="px-3 py-3">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="h-10 w-10 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 font-bold uppercase">
                                        {user?.alias?.[0] || '?'}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-white truncate max-w-[150px]">
                                            {user?.alias}
                                        </span>
                                        <span className="text-xs text-slate-400 truncate max-w-[150px]">
                                            @{user?.username}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="my-1 h-px bg-slate-800"/>

                            <div className="space-y-1">
                                <Link to="/profile"
                                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
                                    <User size={16}/> My Profile
                                </Link>
                                {user?.role === 'ARTIST' && (
                                    <Link to="/artist/dashboard"
                                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-violet-400 hover:bg-violet-500/10 transition-colors">
                                        <Music size={16}/> Artist Hub
                                    </Link>
                                )}
                                <Link to="/settings"
                                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors">
                                    <Settings size={16}/> Settings
                                </Link>
                                <Link to="/subscription"
                                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
                                    <CreditCard size={16}/> Subscription
                                </Link>
                            </div>

                            <div className="my-1 h-px bg-slate-800"/>

                            <button
                                onClick={handleLogout}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                                <LogOut size={16}/> Log out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};