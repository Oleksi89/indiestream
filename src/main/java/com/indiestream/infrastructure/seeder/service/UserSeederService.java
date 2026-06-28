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

    public static final String SEED_DOMAIN = "artist_5@seed.indiestream.local";
    public static final String SEED_PASSWORD = "SeedPassword123!";

    @Getter
    private final List<UUID> seededArtistIds = new ArrayList<>();
    @Getter
    private final List<UUID> seededListenerIds = new ArrayList<>();

    /**
     * Idempotently seeds a specified number of Artists and Listeners.
     */
    public void seedUsers(int artistCount, int listenerCount) {
        log.info("--- PHASE 1a: SEEDING SOCIAL GRAPH ---");

        for (int i = 1; i <= artistCount; i++) {
            UUID id = createSeedUser("artist_" + i, "Seed Artist " + i, true);
            if (id != null && !seededArtistIds.contains(id)) {
                seededArtistIds.add(id);
            }
        }

        for (int i = 1; i <= listenerCount; i++) {
            UUID id = createSeedUser("listener_" + i, "Seed Listener " + i, false);
            if (id != null && !seededListenerIds.contains(id)) {
                seededListenerIds.add(id);
            }
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
            String role =  isArtist ? "ARTIST" : "USER";

            RegisterRequestDto request = new RegisterRequestDto(email, usernamePrefix, alias, SEED_PASSWORD, role);
            UserProfileResponse response = authModuleApi.register(request);

            return response.id();
        } catch (Exception e) {
            log.error("Failed to seed user {}: {}", email, e.getMessage());
            return null;
        }
    }

}