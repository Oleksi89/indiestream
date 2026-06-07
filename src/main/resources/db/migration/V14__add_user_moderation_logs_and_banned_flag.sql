ALTER TABLE users
    ADD COLUMN is_banned BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE user_moderation_logs
(
    id         UUID PRIMARY KEY,
    user_id    UUID                     NOT NULL REFERENCES users (id),
    admin_id   UUID,
    action     VARCHAR(50)              NOT NULL,
    reason     TEXT                     NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_mod_logs_user_id ON user_moderation_logs (user_id);