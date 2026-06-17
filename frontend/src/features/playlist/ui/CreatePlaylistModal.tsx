import React, {useState} from 'react';
import {createPortal} from 'react-dom';
import {X, Lock, Globe} from 'lucide-react';
import {useCreatePlaylist} from '../hooks/usePlaylists';
import {Button} from '@/shared/ui/button';
import {cn} from '@/shared/lib/utils';
import {useTranslation} from '@/shared/lib/i18n/useTranslation';

interface CreatePlaylistModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CreatePlaylistModal = ({isOpen, onClose}: CreatePlaylistModalProps) => {
    const {t} = useTranslation();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isPublic, setIsPublic] = useState(true);

    const createPlaylist = useCreatePlaylist();

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createPlaylist.mutate({name, description, isPublic, isCollaborative: false}, {
            onSuccess: () => {
                setName('');
                setDescription('');
                onClose();
            }
        });
    };

    const modal = (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-playlist-title"
                className="bg-slate-900 border border-slate-700/50 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b border-slate-800">
                    <h2 id="create-playlist-title" className="text-lg font-bold">{t.playlist.create.title}</h2>
                    <button onClick={onClose} aria-label={t.common.close} title={t.common.close}
                            className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" aria-hidden="true"/>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div className="space-y-1">
                        <label htmlFor="create-playlist-name"
                               className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t.playlist.create.nameLabel}</label>
                        <input
                            id="create-playlist-name"
                            required
                            autoFocus
                            type="text"
                            placeholder={t.playlist.create.namePlaceholder}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-md py-2 px-3 text-sm focus:ring-1 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all"
                        />
                    </div>

                    <div className="space-y-1">
                        <label htmlFor="create-playlist-description"
                               className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t.playlist.create.descriptionLabel}</label>
                        <textarea
                            id="create-playlist-description"
                            rows={3}
                            placeholder={t.playlist.create.descriptionPlaceholder}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-md py-2 px-3 text-sm focus:ring-1 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all resize-none"
                        />
                    </div>

                    <div className="pt-2">
                        <span
                            className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">{t.playlist.create.privacyLabel}</span>
                        <div className="grid grid-cols-2 gap-3" role="group" aria-label={t.playlist.create.privacyLabel}>
                            <button
                                type="button"
                                onClick={() => setIsPublic(true)}
                                aria-pressed={isPublic}
                                aria-label={t.playlist.create.selectPublic}
                                className={cn(
                                    "flex items-center justify-center gap-2 py-2 px-3 rounded-md border transition-all",
                                    isPublic ? "bg-violet-600/10 border-violet-500 text-violet-400" : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800"
                                )}
                            >
                                <Globe className="w-4 h-4" aria-hidden="true"/> {t.playlist.create.public}
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsPublic(false)}
                                aria-pressed={!isPublic}
                                aria-label={t.playlist.create.selectPrivate}
                                className={cn(
                                    "flex items-center justify-center gap-2 py-2 px-3 rounded-md border transition-all",
                                    !isPublic ? "bg-violet-600/10 border-violet-500 text-violet-400" : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800"
                                )}
                            >
                                <Lock className="w-4 h-4" aria-hidden="true"/> {t.playlist.create.private}
                            </button>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
                        <Button type="button" variant="ghost" onClick={onClose}>{t.common.cancel}</Button>
                        <Button type="submit" disabled={!name.trim() || createPlaylist.isPending}
                                className="bg-violet-600 hover:bg-violet-500">
                            {createPlaylist.isPending ? t.playlist.create.submitting : t.playlist.create.submit}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );

    return createPortal(modal, document.body);
};