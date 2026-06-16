package com.indiestream.infrastructure.seeder.service;

import com.indiestream.auth.AuthModuleApi;
import com.indiestream.auth.dto.RegisterRequestDto;
import com.indiestream.auth.dto.UserProfileResponse;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@Profile("seeder")
@RequiredArgsConstructor
public class UserSeederService {

    private final AuthModuleApi authModuleApi;
    private final NamedParameterJdbcTemplate jdbcTemplate;

    public static final String SEED_DOMAIN = "@seed.indiestream.local";
    public static final String SEED_PASSWORD = "SeedPassword123!";

    @Getter
    private final List<UUID> seededArtistIds = new ArrayList<>();
    @Getter
    private final List<UUID> seededListenerIds = new ArrayList<>();

    /**
     * Idempotently seeds 8 Artists and 22 Listeners.
     */
    public void seedUsers() {
        log.info("--- PHASE 1: SEEDING SOCIAL GRAPH ---");

        for (int i = 1; i <= 8; i++) {
            UUID id = createSeedUser("artist_" + i, "Seed Artist " + i, true);
            if (id != null) seededArtistIds.add(id);
        }

        for (int i = 1; i <= 22; i++) {
            UUID id = createSeedUser("listener_" + i, "Seed Listener " + i, false);
            if (id != null) seededListenerIds.add(id);
        }

        log.info("Social Graph Seeded. Active Seed Artists: {}, Active Seed Listeners: {}",
                seededArtistIds.size(), seededListenerIds.size());
    }

    private UUID createSeedUser(String usernamePrefix, String alias, boolean isArtist) {
        String email = usernamePrefix + SEED_DOMAIN;

        // Idempotency Check
        if (authModuleApi.getUserByEmail(email).isPresent()) {
            log.debug("User {} already exists. Skipping.", email);
            return authModuleApi.getUserByEmail(email).get().id();
        }

        try {
            RegisterRequestDto request = new RegisterRequestDto(email, usernamePrefix, alias, SEED_PASSWORD);
            UserProfileResponse response = authModuleApi.register(request);

            // Backdoor: Force role to ARTIST via native SQL since the public API explicitly restricts registration to USER
            if (isArtist) {
                jdbcTemplate.update(
                        "UPDATE users SET role = 'ARTIST' WHERE id = :id",
                        new MapSqlParameterSource("id", response.id())
                );
            }
            return response.id();
        } catch (Exception e) {
            log.error("Failed to seed user {}: {}", email, e.getMessage());
            return null;
        }
    }

}