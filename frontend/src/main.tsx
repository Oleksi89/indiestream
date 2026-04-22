import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom';
import "@/app/globals.css"
import {router} from "@/app/router.tsx";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false, // Disable automatic refetching when switching browser tabs
            retry: 1, // Number of retry attempts on error
            staleTime: 5 * 60 * 1000, // Data is considered "fresh" for 5 minutes
        },
    },
});

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        </QueryClientProvider>
    </StrictMode>
)
