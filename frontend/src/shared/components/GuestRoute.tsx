import {Navigate, Outlet} from 'react-router-dom';
import {useAuthStore} from '@/shared/store/authStore';

/**
 * Restricts access to guest-only routes (e.g., login, register)
 * Prevents active sessions from accessing authentication forms
 */
export const GuestRoute = () => {
    const hasToken = useAuthStore((state) => !!state.token);

    if (hasToken) {
        return <Navigate to="/" replace/>;
    }

    return <Outlet/>;
};