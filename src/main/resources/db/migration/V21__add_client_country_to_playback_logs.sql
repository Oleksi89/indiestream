-- Adds pre-resolved country codes to avoid live IP mapping during heavy analytics queries.

ALTER TABLE raw_playback_logs
    ADD COLUMN client_country VARCHAR(2);

COMMENT ON COLUMN raw_playback_logs.client_country IS 'Resolved ISO-3166-1 alpha-2 country code from CDN edge headers (e.g., CF-IPCountry). Fallbacks to XX if unknown.';