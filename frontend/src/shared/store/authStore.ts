import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {UserDto} from "@/features/auth/types";

interface AuthState {
    token: string | null;
    user: UserDto | null;
    setToken: (token: string) => void;
    setUser: (user: UserDto | null) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            user: null,
            setToken: (token) => set({token}),
            setUser: (user) => set({user}),
            logout: () => set({token: null, user: null}),
        }),
        {
            name: 'indiestream-auth', // Key in localStorage
            // Strict persistence boundary: only cache the token
            partialize: (state) => ({ token: state.token }),
        }
    )
);