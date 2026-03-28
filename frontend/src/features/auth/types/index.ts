import { z } from 'zod';

// Zod schema acts as the single source of truth for both validation and TypeScript types
export const loginSchema = z.object({
    email: z.email("Invalid email format"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginRequest = z.infer<typeof loginSchema>;

export interface AuthResponse {
    token: string;
}