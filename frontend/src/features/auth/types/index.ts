import {z} from 'zod';

export const loginSchema = z.object({
    email: z.email("Invalid email format"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginRequest = z.infer<typeof loginSchema>;

// Strict Zod schema acting as a unified guard matching backend jakarta.validation
export const registerSchema = z.object({
    email: z.email("Invalid email format"),
    username: z.string()
        .min(3, "Username must be at least 3 characters")
        .max(20, "Username cannot exceed 20 characters")
        .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
    alias: z.string()
        .min(1, "Display name is required")
        .max(100, "Display name cannot exceed 100 characters"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

export type RegisterRequest = z.infer<typeof registerSchema>;

export interface AuthResponse {
    token: string;
}

export interface UserProfileDto {
    bio: string | null;
    avatarPath: string | null;
    bannerPath: string | null;
    isPrivate: boolean;
    hideSubscriptions: boolean;
    updatedAt: string;
}

// Represents the User entity returned by the backend (without sensitive data)
export interface UserDto {
    id: string;
    email: string;
    username: string;
    alias: string;
    role: 'USER' | 'ARTIST' | 'ADMIN';
    profile?: UserProfileDto;
    createdAt: string;
    // Client-side projection fields for social graph state
    followersCount?: number;
    followingCount?: number;
    isFollowedByMe?: boolean;
}

export interface PageResponse<T> {
    content: T[];
    pageNumber: number;
    pageSize: number;
    totalElements: number;
    totalPages: number;
    isLast: boolean;
}