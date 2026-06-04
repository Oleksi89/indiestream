import {z} from 'zod';
import {AVAILABLE_GENRES} from './index';

// Metadata Step Validation
export const trackMetadataSchema = z.object({
    title: z.string()
        .min(1, "Track title is required")
        .max(100, "Title cannot exceed 100 characters"),
    genre: z.enum(AVAILABLE_GENRES as unknown as [string, ...string[]]).optional(),
    isExplicit: z.boolean().default(false),
    customTags: z.array(
        z.string()
            .regex(/^[a-z0-9-]+$/, "Tags must be lowercase, alphanumeric, or hyphenated")
            .max(30, "A tag cannot exceed 30 characters")
    ).max(10, "Maximum of 10 custom tags allowed").default([])
});

export type TrackMetadataFormValues = z.infer<typeof trackMetadataSchema>;

// Shared constants for media validation
export const MEDIA_LIMITS = {
    MAX_AUDIO_SIZE: 50 * 1024 * 1024, // 50MB
    MAX_IMAGE_SIZE: 5 * 1024 * 1024,  // 5MB
    AUDIO_TYPES: ['audio/mpeg', 'audio/wav', 'audio/flac'] as const,
    IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'] as const
};