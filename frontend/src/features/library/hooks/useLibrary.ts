import {useQuery} from '@tanstack/react-query';
import {libraryApi} from '../api/library.api';

export const libraryKeys = {
    all: ['library'] as const,
    me: () => [...libraryKeys.all, 'me'] as const,
};

export const useLibrary = () => {
    return useQuery({
        queryKey: libraryKeys.me(),
        queryFn: libraryApi.getMyLibrary,
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    });
};