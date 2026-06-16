import React, {useState} from 'react';
import {useAuthStore} from '@/shared/store/authStore';
import {usePlayerStore} from '@/shared/store/playerStore';
import {useOnboardingTracks} from '../hooks/useRecommendationQueries';
import {AVAILABLE_GENRES} from '@/features/media/types';
import {Disc3, Loader2, CheckCircle2, ArrowRight} from 'lucide-react';
import toast from 'react-hot-toast';

export const TasteOnboarding: React.FC = () => {
    const user = useAuthStore(state => state.user);
    const setUser = useAuthStore(state => state.setUser);
    const {playContext} = usePlayerStore();

    const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
    const {mutate: fetchTracks, isPending} = useOnboardingTracks();

    const toggleGenre = (genre: string) => {
        setSelectedGenres(prev =>
            prev.includes(genre)
                ? prev.filter(g => g !== genre)
                : [...prev, genre]
        );
    };

    const handleCalibration = () => {
        if (selectedGenres.length < 3) {
            toast.error('Please select at least 3 genres to proceed.');
            return;
        }

        fetchTracks(selectedGenres, {
            onSuccess: (tracks) => {
                if (tracks.length === 0) {
                    toast.error('Could not find tracks for those genres. Please try others.');
                    return;
                }

                // 1. Inject into the WebAudio Player State Machine instantly
                playContext(tracks, {type: 'PUBLIC_FEED'});

                toast.success('Queue generated! Like or skip tracks to fine-tune your algorithm.');

                // 2. Remove the Calibration flag locally to bypass the Router Guard
                if (user) {
                    setUser({
                        ...user,
                        profile: {
                            ...user.profile,
                            needsTasteCalibration: false
                        }
                    } as any);
                }
            },
            onError: () => {
                toast.error('Failed to generate your starter feed.');
            }
        });
    };

    return (
        <div
            className="flex flex-col items-center justify-center min-h-[70vh] max-w-4xl mx-auto px-4 text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div
                className="w-20 h-20 bg-violet-500/20 rounded-full flex items-center justify-center text-violet-400 mb-2 shadow-[0_0_30px_rgba(139,92,246,0.3)]">
                <Disc3 size={40} className="animate-[spin_4s_linear_infinite]"/>
            </div>

            <div className="space-y-3">
                <h1 className="text-4xl font-extrabold tracking-tight text-white">Let's build your algorithm</h1>
                <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                    Select <strong className="text-white">at least 3 genres</strong> you enjoy. We'll generate a custom
                    radio station to kickstart your personalized AI Taste Profile.
                </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 w-full py-6">
                {AVAILABLE_GENRES.map((genre) => {
                    const isSelected = selectedGenres.includes(genre);
                    return (
                        <button
                            key={genre}
                            onClick={() => toggleGenre(genre)}
                            className={`
                                relative overflow-hidden px-4 py-3 rounded-xl border text-sm font-semibold transition-all duration-300 transform active:scale-95
                                ${isSelected
                                ? 'bg-violet-600/20 border-violet-500 text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.2)]'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200'}
                            `}
                        >
                            <span className="relative z-10">{genre}</span>
                            {isSelected && (
                                <CheckCircle2 size={16} className="absolute top-2 right-2 text-violet-500 opacity-50"/>
                            )}
                        </button>
                    );
                })}
            </div>

            <button
                onClick={handleCalibration}
                disabled={selectedGenres.length < 3 || isPending}
                className={`
                    flex items-center gap-2 px-8 py-4 rounded-full font-bold text-lg transition-all duration-300
                    ${selectedGenres.length >= 3
                    ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-xl hover:shadow-violet-500/25 hover:-translate-y-1'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'}
                `}
            >
                {isPending ? <Loader2 size={24} className="animate-spin"/> : 'Start Discovery Engine'}
                {!isPending && <ArrowRight size={20}/>}
            </button>
        </div>
    );
};