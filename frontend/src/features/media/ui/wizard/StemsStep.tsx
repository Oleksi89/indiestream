import React, {useState} from 'react';
import {useUploadWizardStore} from '../../hooks/useUploadWizardStore';
import type {StemUploadPayload} from '../../types';
import {FileAudio, Plus, X, ArrowLeft, Send, FolderPlus} from 'lucide-react';
import {MEDIA_LIMITS} from '../../types/track.schema';
import toast from 'react-hot-toast';

export const StemsStep = () => {
    const {stems, setStems, setStep} = useUploadWizardStore();
    const [localStems, setLocalStems] = useState<StemUploadPayload[]>(stems);

    const addStem = () => setLocalStems([...localStems, {name: '', file: null as unknown as File}]);
    const removeStem = (index: number) => setLocalStems(localStems.filter((_, i) => i !== index));

    const handleStemChange = (index: number, field: keyof StemUploadPayload, value: string | File) => {
        const updated = [...localStems];
        updated[index] = {...updated[index], [field]: value};
        setLocalStems(updated);
    };

    const handleBulkStemUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;

        const files = Array.from(e.target.files)
            .filter(f => MEDIA_LIMITS.AUDIO_TYPES.includes(f.type as any) && f.size <= MEDIA_LIMITS.MAX_AUDIO_SIZE)
            .sort((a, b) => a.name.localeCompare(b.name, undefined, {numeric: true}));

        const newStems = files.map(file => {
            const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
            return {name: nameWithoutExt, file};
        });

        setLocalStems(prev => [...prev, ...newStems]);
        e.target.value = '';
    };

    const handleSubmit = () => {
        if (localStems.length > 0) {
            const hasInvalidStem = localStems.some(s => !s.name.trim() || !(s.file instanceof File));
            if (hasInvalidStem) {
                toast.error('All added stems must have a name and a valid audio file.');
                return;
            }
        }
        setStems(localStems);
        setStep('UPLOADING');
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-sm font-medium text-slate-200">Interactive Stems <span
                        className="text-slate-500 text-xs">(Optional)</span></h3>
                    <p className="text-xs text-slate-500 mt-1">Upload separated instruments (e.g., Vocals, Drums) for
                        the dynamic player.</p>
                </div>
                <div className="flex gap-2">
                    <label
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 rounded-md hover:bg-slate-700 transition-colors cursor-pointer">
                        <FolderPlus size={14}/> Bulk Add
                        <input type="file" multiple accept=".wav,.flac,.mp3" className="hidden"
                               onChange={handleBulkStemUpload}/>
                    </label>
                    <button type="button" onClick={addStem}
                            className="flex items-center gap-1.5 text-xs font-medium text-violet-400 bg-violet-400/10 px-3 py-1.5 rounded-md hover:bg-violet-400/20 transition-colors">
                        <Plus size={14}/> Add Stem
                    </button>
                </div>
            </div>

            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                {localStems.length === 0 ? (
                    <div
                        className="flex flex-col items-center justify-center py-10 px-4 text-center border-2 border-dashed border-slate-700/50 rounded-xl bg-slate-900/30">
                        <p className="text-sm font-medium text-slate-400">No stems added</p>
                        <p className="text-xs text-slate-500 mt-1 max-w-[250px]">Your track will be uploaded as a
                            standard stereo file.</p>
                    </div>
                ) : (
                    localStems.map((stem, i) => (
                        <div key={i}
                             className="flex flex-col sm:flex-row items-center gap-3 p-3 rounded-lg border border-slate-700 bg-slate-900/50">
                            <input
                                type="text"
                                placeholder="e.g. Drums, Vocals"
                                value={stem.name}
                                onChange={(e) => handleStemChange(i, 'name', e.target.value)}
                                className="w-full sm:flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-violet-500 outline-none"
                            />
                            <div className="flex items-center w-full sm:w-auto gap-3">
                                <label className="flex-1 sm:w-36 cursor-pointer">
                                    <div
                                        className={`flex items-center justify-center gap-2 px-3 py-2 border rounded-md text-xs transition-colors ${stem.file ? 'border-violet-500 bg-violet-500/10 text-violet-300' : 'border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
                                        <FileAudio size={14} className="shrink-0"/>
                                        <span className="truncate">{stem.file ? stem.file.name : 'Choose Audio'}</span>
                                    </div>
                                    <input type="file" accept=".wav,.flac,.mp3" className="hidden" onChange={(e) => {
                                        if (e.target.files?.[0]) handleStemChange(i, 'file', e.target.files[0]);
                                    }}/>
                                </label>
                                <button type="button" onClick={() => removeStem(i)}
                                        className="p-2 text-slate-500 hover:text-red-400 transition-colors">
                                    <X size={16}/>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div
                className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-slate-800 gap-4">
                <button type="button" onClick={() => setStep('MEDIA')}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 text-slate-300 hover:text-white transition-colors">
                    <ArrowLeft size={16}/> Back
                </button>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {localStems.length === 0 && (
                        <button type="button" onClick={handleSubmit}
                                className="w-full sm:w-auto text-sm font-medium text-slate-400 hover:text-white px-4 py-2.5 rounded-lg hover:bg-slate-800 transition-colors">
                            Skip Stems
                        </button>
                    )}
                    <button type="button" onClick={handleSubmit}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-emerald-900/20">
                        <Send size={16}/> {localStems.length > 0 ? 'Upload with Stems' : 'Process Track'}
                    </button>
                </div>
            </div>
        </div>
    );
};