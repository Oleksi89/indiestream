import {createBrowserRouter} from 'react-router-dom';
import { LoginPage } from '@/pages/auth/LoginPage';
import App from '../App';
import {JSX} from "react";

const routes: ({ path: string; element: JSX.Element })[] = [
    {
        path: '/',
        element: <App />,
    },
    {
        path: '/login',
        element: <LoginPage />,
    },
];

export const router = createBrowserRouter(routes);