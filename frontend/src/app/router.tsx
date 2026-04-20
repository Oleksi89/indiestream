import { createBrowserRouter } from 'react-router-dom';
import { LoginPage } from '@/pages/auth/LoginPage';
import App from '../App';
import type { JSX } from 'react';
import {RegisterPage} from "@/pages/auth/RegisterPage.tsx";

const routes: ({ path: string; element: JSX.Element })[] = [
    {
        path: '/',
        element: <App />,
    },
    {
        path: '/login',
        element: <LoginPage />,
    },
    {
        path: '/register',
        element: <RegisterPage/>,
    }
];

export const router = createBrowserRouter(routes);