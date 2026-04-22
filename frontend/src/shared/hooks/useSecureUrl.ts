import {useState, useEffect} from 'react';
import {useQuery} from '@tanstack/react-query';

/**
 * Custom hook to securely fetch binary assets (images/audio) and manage their Object URLs.
 * Automatically cleans up URLs to prevent memory leaks.
 */
export const useSecureUrl = (
    key: string,
    fetcher: () => Promise<Blob>,
    enabled: boolean = true
) => {
    const [objectUrl, setObjectUrl] = useState<string | null>(null);

    const {data: blob, isLoading, isError} = useQuery({
        queryKey: [key],
        queryFn: fetcher,
        staleTime: Infinity,
        enabled: enabled && !!key
    });

    useEffect(() => {
        if (blob) {
            const url = URL.createObjectURL(blob);
            setObjectUrl(url);

            // Cleanup function to revoke the URL when the component unmounts or blob changes
            return () => {
                URL.revokeObjectURL(url);
            };
        }
    }, [blob]);

    return {url: objectUrl, isLoading, isError};
};