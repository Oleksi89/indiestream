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
import {AdminTrackRegistryPage} from "@/pages/admin/AdminTrackRegistryPage.tsx";
import {AdminReviewInspectorPage} from "@/pages/admin/AdminReviewInspectorPage.tsx";
import {TelemetryProvider} from '@/features/telemetry';
import {AdminPlatformAnalyticsPage} from "@/pages/admin/AdminPlatformAnalyticsPage.tsx";
import {SettingsPage} from "@/pages/profile/SettingsPage.tsx";
import {OnboardingPage} from "@/pages/dashboard/OnboardingPage.tsx";
import {PlatformRulesPage} from "@/pages/legal/PlatformRulesPage.tsx";
import {AdminUserRegistryPage} from "@/pages/admin/AdminUserRegistryPage.tsx"; // Added import

const routes = [
    // Public Routes
    {
        path: '/rules',
        element: <PlatformRulesPage/>,
    },
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
                // tracking only happens for identified users
                element: (
                    <TelemetryProvider>
                        <AuthenticatedLayout/>
                    </TelemetryProvider>
                ),
                children: [
                    {
                        path: '/',
                        element: <DashboardPage/>,
                    },
                    {
                        path: '/onboarding',
                        element: <OnboardingPage/>,
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
                    {
                        path: '/settings',
                        element: <SettingsPage/>,
                    },
                    // Role-Protected Routes
                    {
                        element: <RoleRoute allowedRoles={['ARTIST', 'ADMIN']}/>,
                        children: [
                            {
                                path: '/artist/dashboard',
                                element: <ArtistDashboardPage/>, // Artist hub
                            },
                        ],
                    },
                    // --- ADMIN ONLY ROUTES ---
                    {
                        element: <RoleRoute allowedRoles={['ADMIN']}/>,
                        children: [
                            {
                                path: '/admin/registry',
                                element: <AdminTrackRegistryPage/>,
                            },
                            {
                                path: '/admin/users/registry',
                                element: <AdminUserRegistryPage/>,
                            },
                            {
                                path: '/admin/registry/:id',
                                element: <AdminReviewInspectorPage/>,
                            },
                            {
                                path: '/admin/telemetry',
                                element: <AdminPlatformAnalyticsPage/>,
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