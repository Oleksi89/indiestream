import React, {useState, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {useAuthStore} from '@/shared/store/authStore';
import {usePlayerStore} from '@/shared/store/playerStore';
import {useOnboardingTracks} from '@/features/recommendations/hooks/useRecommendationQueries';
import {AVAILABLE_GENRES, type TrackDto} from '@/features/media/types';
import {TrackContextMenu} from '@/features/media/ui/TrackContextMenu';
import {TrackCard} from '@/features/media/ui/TrackCard';
import {Disc3, Loader2, CheckCircle2, ArrowRight, Heart, Sparkles} from 'lucide-react';
import toast from 'react-hot-toast';

export const OnboardingPage: React.FC = () => {
    const navigate = useNavigate();
    const user = useAuthStore(state => state.user);
    const setUser = useAuthStore(state => state.setUser);
    const {playContext} = usePlayerStore();

    const [step, setStep] = useState<1 | 2>(1);
    const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
    const [previewTracks, setPreviewTracks] = useState<TrackDto[]>([]);

    const {mutate: fetchTracks, isPending} = useOnboardingTracks();

    // Safe Router Guard: Redirects if calibration is already complete
    useEffect(() => {
        if (user && user.profile?.needsTasteCalibration === false) {
            navigate('/', {replace: true});
        }
    }, [user, navigate]);

    // Prevent UI flashing during redirect
    if (user && user.profile?.needsTasteCalibration === false) {
        return null;
    }

    const toggleGenre = (genre: string) => {
        setSelectedGenres(prev =>
            prev.includes(genre)
                ? prev.filter(g => g !== genre)
                : [...prev, genre]
        );
    };

    const handleGenerateFeed = () => {
        if (selectedGenres.length < 3) {
            toast.error('Please select at least 3 genres.');
            return;
        }

        fetchTracks(selectedGenres, {
            onSuccess: (tracks) => {
                if (tracks.length === 0) {
                    toast.error('Could not find tracks for those genres. Please try others.');
                    return;
                }
                setPreviewTracks(tracks as TrackDto[]);

                // Immediately start playing the curated list to engage the user
                playContext(tracks as TrackDto[], {type: 'PUBLIC_FEED'});
                setStep(2);
                toast.success('Curated radio started! Like tracks to build your profile.');
            },
            onError: () => toast.error('Failed to generate feed.')
        });
    };

    /**
     * Completes the calibration process.
     * Updates local state, triggering the useEffect above to navigate to the Dashboard.
     */
    const handleCompleteCalibration = () => {
        if (user) {
            setUser({
                ...user,
                profile: {
                    ...user.profile,
                    needsTasteCalibration: false
                }
            } as any);
        }
        toast.success("Algorithm initialized. Welcome to your Discovery Feed!");
    };

    return (
        <div className="container mx-auto px-4 py-12 max-w-6xl">
            {step === 1 ? (
                <div
                    className="flex flex-col items-center justify-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div
                        className="w-20 h-20 bg-violet-500/20 rounded-full flex items-center justify-center text-violet-400 mb-2 shadow-[0_0_30px_rgba(139,92,246,0.3)]">
                        <Disc3 size={40} className="animate-[spin_4s_linear_infinite]"/>
                    </div>

                    <div className="text-center space-y-3">
                        <h1 className="text-4xl font-extrabold tracking-tight text-white">Let's build your
                            algorithm</h1>
                        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                            Select <strong className="text-white">at least 3 genres</strong> you enjoy. We'll generate a
                            custom radio station to kickstart your personalized AI Taste Profile.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 w-full py-6">
                        {AVAILABLE_GENRES.map((genre) => {
                            const isSelected = selectedGenres.includes(genre);
                            return (
                                <button
                                    key={genre}
                                    onClick={() => toggleGenre(genre)}
                                    className={`relative overflow-hidden px-4 py-3 rounded-xl border text-sm font-semibold transition-all duration-300 transform active:scale-95 ${isSelected ? 'bg-violet-600/20 border-violet-500 text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.2)]' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200'}`}
                                >
                                    <span className="relative z-10">{genre}</span>
                                    {isSelected && <CheckCircle2 size={16}
                                                                 className="absolute top-2 right-2 text-violet-500 opacity-50"/>}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        onClick={handleGenerateFeed}
                        disabled={selectedGenres.length < 3 || isPending}
                        className={`flex items-center gap-2 px-8 py-4 rounded-full font-bold text-lg transition-all duration-300 ${selectedGenres.length >= 3 ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-xl hover:shadow-violet-500/25 hover:-translate-y-1' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                    >
                        {isPending ? <Loader2 size={24} className="animate-spin"/> : 'Generate Custom Radio'}
                        {!isPending && <ArrowRight size={20}/>}
                    </button>
                </div>
            ) : (
                <div className="flex flex-col space-y-8 animate-in slide-in-from-right-8 duration-500 pb-24">
                    <header
                        className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-800 pb-6">
                        <div className="max-w-2xl">
                            <h1 className="text-3xl font-bold tracking-tight text-white mb-2 flex items-center gap-3">
                                <Sparkles className="text-violet-400" size={28}/> Train Your Algorithm
                            </h1>
                            <p className="text-slate-400 flex items-start sm:items-center gap-2 text-sm sm:text-base leading-relaxed">
                                <Heart size={18} className="text-violet-400 shrink-0 mt-0.5 sm:mt-0"/>
                                We are playing your curated tracks. Use the player bar to Like the ones
                                you enjoy. This instantly shapes your mathematical taste profile.
                            </p>
                        </div>
                        <button
                            onClick={handleCompleteCalibration}
                            className="shrink-0 px-8 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-full transition-all flex items-center gap-2 shadow-lg shadow-violet-500/20"
                        >
                            Finish Calibration <ArrowRight size={18}/>
                        </button>
                    </header>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {previewTracks.map((track, index) => (
                            <TrackContextMenu key={track.id} track={track}>
                                <TrackCard
                                    track={track}
                                    variant="grid"
                                    onPlayOverride={() => playContext(previewTracks, {type: 'PUBLIC_FEED'}, index)}
                                />
                            </TrackContextMenu>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};