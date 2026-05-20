CREATE TABLE user_followers
(
    follower_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    followed_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, followed_id)
);

CREATE INDEX idx_user_followers_followed_id ON user_followers (followed_id);
CREATE INDEX idx_user_followers_follower_id ON user_followers (follower_id);