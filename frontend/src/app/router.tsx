import {createBrowserRouter} from 'react-router-dom';
import {LoginPage} from '@/pages/auth/LoginPage';
import {RegisterPage} from "@/pages/auth/RegisterPage";
import {ProtectedRoute} from "@/shared/components/ProtectedRoute";
import {AuthenticatedLayout} from "@/shared/layouts/AuthenticatedLayout";
import {DashboardPage} from "@/pages/dashboard/DashboardPage";
import {GuestRoute} from "@/shared/components/GuestRoute";
import {ArtistDashboardPage} from "@/pages/artist/ArtistDashboardPage";
import {RoleRoute} from "@/shared/components/RoleRoute";
import {NotFoundPage} from "@/pages/error/NotFoundPage";
import {PlaylistPage} from "@/pages/playlist/PlaylistPage.tsx";
import {ProfilePage} from "@/pages/profile/ProfilePage.tsx";
import {SearchPage} from "@/pages/search/SearchPage.tsx";

const routes = [
    // Guest Only Routes
    {
        element: <GuestRoute/>,
        children: [
            {
                path: '/login',
                element: <LoginPage/>,
            },
            {
                path: '/register',
                element: <RegisterPage/>,
            },
        ],
    },
    // Private Routes wrapped in ProtectedRoute and AuthenticatedLayout
    {
        element: <ProtectedRoute/>,
        children: [
            {
                element: <AuthenticatedLayout/>,
                children: [
                    {
                        path: '/',
                        element: <DashboardPage/>,
                    },
                    {
                        path: '/search',
                        element: <SearchPage/>,
                    },
                    {
                        path: '/playlist/:id',
                        element: <PlaylistPage/>,
                    },
                    {
                        path: '/user/:username',
                        element: <ProfilePage/>
                    },
                    // Role-Protected Routes
                    {
                        element: <RoleRoute allowedRoles={['ARTIST', 'ADMIN']}/>,
                        children: [
                            {
                                path: '/artist/dashboard',
                                element: <ArtistDashboardPage/>, // Artist upload hub
                            },
                        ],
                    },
                ],
            },
        ],
    },
    {
        path: '*',
        element: <NotFoundPage/>,
    },
];

export const router = createBrowserRouter(routes);