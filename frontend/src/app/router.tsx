import {createBrowserRouter} from 'react-router-dom';
import { LoginPage } from '@/pages/auth/LoginPage';
import type { JSX } from 'react';
import {RegisterPage} from "@/pages/auth/RegisterPage";
import {ProtectedRoute} from "@/shared/components/ProtectedRoute";
import {AuthenticatedLayout} from "@/shared/layouts/AuthenticatedLayout";
import {DashboardPage} from "@/pages/dashboard/DashboardPage";
import {GuestRoute} from "@/shared/components/GuestRoute";

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
                    // Additional private routes like /profile will go here
                ],
            },
        ],
    },
];

export const router = createBrowserRouter(routes);