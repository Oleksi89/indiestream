-- Create the isolated profiles table linked 1-to-1 with users
CREATE TABLE user_profiles
(
    user_id            UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    bio                VARCHAR(500),
    avatar_path        VARCHAR(255),
    banner_path        VARCHAR(255),
    is_private         BOOLEAN NOT NULL         DEFAULT false,
    hide_subscriptions BOOLEAN NOT NULL         DEFAULT false,
    updated_at         TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Safely backfill existing users to guarantee referential integrity
INSERT INTO user_profiles (user_id, updated_at)
SELECT id, CURRENT_TIMESTAMP
FROM users;