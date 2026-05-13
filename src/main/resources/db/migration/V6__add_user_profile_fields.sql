-- 1. Add columns without constraints to allow backfilling
ALTER TABLE users
    ADD COLUMN username VARCHAR(50);
ALTER TABLE users
    ADD COLUMN alias VARCHAR(100);

-- 2. Backfill existing records safely
UPDATE users
SET username = CONCAT(SPLIT_PART(email, '@', 1), '_', SUBSTRING(CAST(id AS TEXT) FROM 1 FOR 8)),
    alias    = SPLIT_PART(email, '@', 1)
WHERE username IS NULL;

-- 3. Enforce strict constraints
ALTER TABLE users
    ALTER COLUMN username SET NOT NULL;
ALTER TABLE users
    ALTER COLUMN alias SET NOT NULL;
ALTER TABLE users
    ADD CONSTRAINT uk_users_username UNIQUE (username);