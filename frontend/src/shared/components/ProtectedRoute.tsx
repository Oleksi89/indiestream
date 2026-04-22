import {Navigate, Outlet} from 'react-router-dom';
import {useAuthStore} from '@/shared/store/authStore';

/**
 * Higher-order component to protect private routes.
 * Redirects to /login if the user is not authenticated.
 */
export const ProtectedRoute = () => {
    const hasToken = useAuthStore((state) => !!state.token);

    if (!hasToken) {
        return <Navigate to="/login" replace/>;
    }

    return <Outlet/>;
};