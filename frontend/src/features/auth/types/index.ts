import { z } from 'zod';

// Zod schema acts as the single source of truth for both validation and TypeScript types
export const loginSchema = z.object({
    email: z.email("Invalid email format"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginRequest = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
    email: z.email("Invalid email format"),
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

// Represents the User entity returned by the backend (without sensitive data)
export interface UserDto {
    id: string | number;
    email: string;
    // TODO: [Auth] - Add missing fields
}