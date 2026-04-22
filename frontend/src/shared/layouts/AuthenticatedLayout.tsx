import {Outlet} from 'react-router-dom';
import {Navbar} from '@/shared/components/Navbar';

/**
 * Layout for authenticated pages.
 * Includes the persistent navigation and content container.
 */
export const AuthenticatedLayout = () => {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            <Navbar/>
            <main className="mx-auto max-w-screen-2xl px-6 py-8">
                <Outlet/>
            </main>
        </div>
    );
};