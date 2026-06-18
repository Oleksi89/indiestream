import {useTranslation} from '@/shared/lib/i18n/useTranslation';

export const ExplicitBadge = () => {
    const {t} = useTranslation();
    return (
        <span
            className="flex-shrink-0 inline-flex items-center justify-center w-[14px] h-[14px] text-[9px] font-bold text-slate-300 bg-slate-700/80 rounded-[3px] border border-slate-600 ml-2"
            title={t.media.explicit.title}
            aria-label={t.media.explicit.title}>
            {t.media.explicit.label}
        </span>
    );
};
