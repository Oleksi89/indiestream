import {z} from 'zod';

export const getLoginSchema = (t: any) => z.object({
    email: z.email(t.auth.validation.invalidEmail),
    password: z.string().min(6, t.auth.validation.passwordMin),
});

export type LoginRequest = z.infer<ReturnType<typeof getLoginSchema>>;

// Strict Zod schema acting as a unified guard matching backend jakarta.validation
export const getRegisterSchema = (t: any) => z.object({
    email: z.email(t.auth.validation.invalidEmail),
    username: z.string()
        .min(3, t.auth.validation.usernameMin)
        .max(20, t.auth.validation.usernameMax)
        .regex(/^[a-zA-Z0-9_]+$/, t.auth.validation.usernameRegex),
    alias: z.string()
        .min(1, t.auth.validation.aliasRequired)
        .max(100, t.auth.validation.aliasMax),
    password: z.string().min(6, t.auth.validation.passwordMin),
    confirmPassword: z.string().min(6, t.auth.validation.passwordMin),
}).refine((data) => data.password === data.confirmPassword, {
    message: t.auth.validation.passwordsMismatch,
    path: ["confirmPassword"],
});

export type RegisterRequest = z.infer<ReturnType<typeof getRegisterSchema>>;

export interface AuthResponse {
    token: string;
}

export interface UserProfileDto {
    bio: string | null;
    avatarPath: string | null;
    bannerPath: string | null;
    isPrivate: boolean;
    hideSubscriptions: boolean;
    needsTasteCalibration?: boolean;
    updatedAt: string;
}

// Clean, base DTO used for authentication
export interface UserDto {
    id: string;
    email: string;
    username: string;
    alias: string;
    role: 'USER' | 'ARTIST' | 'ADMIN';
    profile?: UserProfileDto;
    createdAt: string;
}

// Rich View Model used strictly for Profile Pages
export interface UserProfileResponse extends UserDto {
    followersCount: number;
    followingCount: number;
    isFollowedByMe: boolean;
}

// Lightweight View Model used for Follower/Following Lists
export interface UserSummaryDto {
    id: string;
    username: string;
    alias: string;
    avatarPath: string | null;
}

/**
 * Shared Public Profile DTO matching the backend AuthModuleApi projection.
 * Strictly lightweight for autocomplete and collaboration assignments.
 */
export interface UserPublicProfileDto {
    id: string;
    username: string;
    alias: string;
    avatarPath: string | null;
}

export interface PageResponse<T> {
    content: T[];
    pageNumber: number;
    pageSize: number;
    totalElements: number;
    totalPages: number;
    isLast: boolean;
}