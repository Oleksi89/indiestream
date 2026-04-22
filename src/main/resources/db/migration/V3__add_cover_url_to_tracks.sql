-- We need to store the MinIO object path for the track's cover art
-- users might upload tracks without specific cover art.
ALTER TABLE tracks
    ADD COLUMN cover_minio_path VARCHAR(512);