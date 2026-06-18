import React, {useState} from 'react';
import {Tag, X} from 'lucide-react';
import {useTranslation} from '@/shared/lib/i18n/useTranslation';

interface TagFilterInputProps {
    activeTags: string[];
    onAddTag: (tag: string) => void;
    onRemoveTag: (tag: string) => void;
}

export const TagFilterInput = ({activeTags, onAddTag, onRemoveTag}: TagFilterInputProps) => {
    const [inputValue, setInputValue] = useState('');
    const {t} = useTranslation();

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const newTag = inputValue.trim().toLowerCase();
            if (newTag) {
                onAddTag(newTag);
                setInputValue('');
            }
        }
    };

    return (
        <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-slate-500 shrink-0 pr-2 border-r border-slate-800 h-8">
                <Tag size={14}/>
                <span className="text-xs font-semibold uppercase tracking-wider">{t.search.tags}</span>
            </div>
            {activeTags.map(tag => (
                <span key={tag}
                      className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium px-3 py-1.5 rounded-md">
                    {tag}
                    <button onClick={() => onRemoveTag(tag)}
                            className="text-slate-400 hover:text-red-400 transition-colors">
                        <X size={14}/>
                    </button>
                </span>
            ))}
            <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t.search.tagInputPlaceholder}
                className="bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none min-w-[200px]"
            />
        </div>
    );
};