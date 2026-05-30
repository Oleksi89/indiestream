import {User} from 'lucide-react';
import {useSecureUrl} from '@/shared/hooks/useSecureUrl';
import {profileApi} from '@/features/profile/api/profile.api';
import {cn} from '@/shared/lib/utils';

interface UserAvatarProps {
    username: string;
    avatarPath?: string | null;
    className?: string;
}

/**
 * Safely fetches and renders secure MinIO blobs for user avatars.
 * Prevents "hook inside loop" rule violations when rendering Avatar Groups or Lists.
 */
export const UserAvatar = ({username, avatarPath, className}: UserAvatarProps) => {
    const {url, isLoading} = useSecureUrl(
        `avatar-component-${username}`,
        () => profileApi.getAvatarBlob(username),
        !!avatarPath && !!username
    );

    if (isLoading) {
        return <div className={cn("animate-pulse bg-slate-700 shrink-0 rounded-full", className)}/>;
    }

    if (!url) {
        return (
            <div
                className={cn("flex items-center justify-center bg-slate-800 shrink-0 rounded-full border border-white/5", className)}>
                <User className="w-1/2 h-1/2 text-slate-500"/>
            </div>
        );
    }

    return (
        <img
            src={url}
            alt={username}
            className={cn("object-cover shrink-0 rounded-full", className)}
        />
    );
};