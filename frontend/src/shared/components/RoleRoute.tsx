import {Navigate, Outlet} from 'react-router-dom';
import {useAuthStore} from '@/shared/store/authStore';
import type {UserDto} from '@/features/auth/types';

interface RoleRouteProps {
    allowedRoles: Array<UserDto['role']>;
}

/**
 * Restricts access to routes based on user roles.
 * Must be used inside <ProtectedRoute> to ensure token exists.
 */
export const RoleRoute = ({allowedRoles}: RoleRouteProps) => {
    const user = useAuthStore((state) => state.user);
    const token = useAuthStore((state) => state.token);

    // If we have a token but haven't fetched the user profile yet,
    // we show a loader to prevent premature redirection.
    if (token && !user) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-800 border-t-violet-500"/>
            </div>
        );
    }

    // If user role is not in the allowed list, kick them back to the general dashboard
    if (!user || !allowedRoles.includes(user.role)) {
        return <Navigate to="/" replace/>;
    }

    return <Outlet/>;
};