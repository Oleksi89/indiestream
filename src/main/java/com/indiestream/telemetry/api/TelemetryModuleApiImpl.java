package com.indiestream.telemetry.api;

import com.indiestream.telemetry.repository.AnalyticsQueryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TelemetryModuleApiImpl implements TelemetryModuleApi {

    private final AnalyticsQueryRepository analyticsQueryRepository;

    @Override
    public List<UUID> getRecentTrackIds(UUID userId, int days) {
        if (userId == null || days <= 0) return List.of();

        // Calculate the threshold timestamp strictly in UTC
        OffsetDateTime since = OffsetDateTime.now(ZoneOffset.UTC).minusDays(days);
        return analyticsQueryRepository.getRecentTrackIdsForUser(userId, since);
    }
}