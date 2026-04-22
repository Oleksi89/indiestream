import {Link} from 'react-router-dom';

export const NotFoundPage = () => {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-center">
            <h1 className="text-9xl font-extrabold tracking-widest text-slate-900/50">404</h1>
            <div className="absolute">
                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Page not found</h2>
                <p className="mt-4 text-slate-400">Sorry, we couldn't find the page you're looking for.</p>
                <div className="mt-8">
                    <Link
                        to="/"
                        className="inline-flex items-center justify-center rounded-lg bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-violet-500 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
                    >
                        Go back home
                    </Link>
                </div>
            </div>
        </div>
    );
};