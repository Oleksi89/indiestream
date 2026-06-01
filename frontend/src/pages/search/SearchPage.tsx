import * as Tabs from '@radix-ui/react-tabs';
import {Search} from 'lucide-react';
import {useSearchFilters} from '@/features/search/hooks/useSearchFilters';
import {useFullSearch} from '@/features/search/hooks/useSearch';
import {GenreCarousel} from '@/features/search/ui/GenreCarousel';
import {TagFilterInput} from '@/features/search/ui/TagFilterInput';
import {SearchResults} from '@/features/search/ui/SearchResults';

export const SearchPage = () => {
    const {query, tab, genre, tags, setFilters} = useSearchFilters();

    const {data, isLoading} = useFullSearch(query, tags, genre);

    const handleTabChange = (value: string) => setFilters({tab: value as any});
    const toggleGenre = (selectedGenre: string) => setFilters({genre: genre === selectedGenre ? '' : selectedGenre});

    const activeTags = tags ? tags.split(',') : [];

    const handleAddTag = (newTag: string) => {
        if (!activeTags.includes(newTag)) {
            const nextTags = [...activeTags, newTag].join(',');
            setFilters({tags: nextTags});
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        const nextTags = activeTags.filter(t => t !== tagToRemove).join(',');
        setFilters({tags: nextTags});
    };

    const hasSearched = query.length >= 2 || activeTags.length > 0 || genre.length > 0;

    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-slate-950">
            <Tabs.Root value={tab} onValueChange={handleTabChange} className="flex flex-col h-full">

                {/* --- HEADER & FILTERS --- */}
                <div
                    className="sticky top-0 z-20 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800 shrink-0 px-6 pt-8 pb-4">
                    <div className="max-w-7xl mx-auto space-y-6">

                        <div className="flex items-center gap-4">
                            <div className="relative flex-1 max-w-2xl">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"/>
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setFilters({q: e.target.value})}
                                    placeholder="Search for tracks, artists, or playlists..."
                                    className="w-full bg-slate-900 border border-slate-700 rounded-full py-3 pl-12 pr-6 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all text-lg shadow-inner shadow-black/50"
                                />
                            </div>
                        </div>

                        <Tabs.List className="flex items-center gap-6 border-b border-slate-800">
                            {['all', 'tracks', 'artists', 'playlists'].map((t) => (
                                <Tabs.Trigger
                                    key={t}
                                    value={t}
                                    className="pb-3 text-sm font-semibold text-slate-400 capitalize transition-all border-b-2 border-transparent data-[state=active]:text-violet-400 data-[state=active]:border-violet-400 hover:text-slate-200 disabled:opacity-50 outline-none"
                                >
                                    {t}
                                </Tabs.Trigger>
                            ))}
                        </Tabs.List>

                        <div className="flex flex-col gap-4">
                            <GenreCarousel activeGenre={genre} onToggle={toggleGenre}/>
                            <TagFilterInput activeTags={activeTags} onAddTag={handleAddTag}
                                            onRemoveTag={handleRemoveTag}/>
                        </div>

                    </div>
                </div>

                {/* --- RESULTS AREA --- */}
                <div className="flex-1 overflow-y-auto px-6 py-8">
                    <div className="max-w-7xl mx-auto">
                        <SearchResults data={data} isLoading={isLoading} hasSearched={hasSearched}/>
                    </div>
                </div>

            </Tabs.Root>
        </div>
    );
};