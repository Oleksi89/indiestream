ALTER TABLE user_profiles
    ADD COLUMN followers_count BIGINT NOT NULL DEFAULT 0;
ALTER TABLE user_profiles
    ADD COLUMN following_count BIGINT NOT NULL DEFAULT 0;

-- Backfill existing counts
UPDATE user_profiles up
SET followers_count = (SELECT COUNT(*) FROM user_followers uf WHERE uf.followed_id = up.user_id),
    following_count = (SELECT COUNT(*) FROM user_followers uf WHERE uf.follower_id = up.user_id);