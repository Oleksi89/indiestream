import {useState, useRef, useEffect} from 'react';
import {useNavigate, Link} from 'react-router-dom';
import {useAuthStore} from '@/shared/store/authStore';
import {authApi} from '@/features/auth/api/auth.api';
import {User, Settings, LogOut, CreditCard, ChevronDown} from 'lucide-react';

export const Navbar = () => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const logoutStore = useAuthStore((state) => state.logout);

    const handleLogout = async () => {
        try {
            await authApi.logout();
        } catch (error) {
            // Non-blocking: even if backend fails (e.g., token already expired),
            // we must clear local session.
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
                {/* Logo Section */}
                <div className="flex items-center gap-8">
                    <Link to="/" className="flex items-center gap-2">
                        <div
                            className="h-8 w-8 rounded-lg bg-slate-900/50 shadow-lg shadow-violet-500/20"/>
                        <span className="text-xl font-bold tracking-tight text-white">IndieStream</span>
                    </Link>
                </div>

                {/* Profile Dropdown */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="group flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/50 p-1 pr-3 transition-all hover:border-violet-500/50 hover:bg-slate-800"
                    >
                        <div className="relative">
                            <div
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-300 ring-2 ring-transparent transition-all group-hover:ring-violet-500/30">
                                <User size={18}/>
                            </div>
                            <div
                                className="absolute inset-0 rounded-full bg-violet-500/10 blur-md transition-opacity group-hover:opacity-100 opacity-0"/>
                        </div>
                        <ChevronDown size={14}
                                     className={`text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}/>
                    </button>

                    {isDropdownOpen && (
                        <div
                            className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-slate-800 bg-slate-900 p-2 shadow-2xl ring-1 ring-black ring-opacity-5 animate-in fade-in zoom-in duration-100">
                            <div className="px-3 py-2">
                                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Account</p>
                                <p className="mt-1 truncate text-sm font-semibold text-white">Guest Artist</p>
                            </div>

                            <div className="my-1 h-px bg-slate-800"/>

                            <div className="space-y-1">
                                <Link to="/profile"
                                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
                                    <User size={16}/> Profile
                                </Link>
                                <Link to="/settings"
                                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
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
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
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