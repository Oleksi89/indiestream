package com.indiestream.telemetry.domain;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Getter
@RequiredArgsConstructor
public enum AnalyticsTimeRange {
    LAST_7_DAYS(7),
    LAST_30_DAYS(30),
    ALL_TIME(3650); // Fallback to 10 years

    private final int days;

    public LocalDate getCurrentStartDate() {
        return LocalDate.now(ZoneOffset.UTC).minusDays(this.days);
    }

    public LocalDate getPreviousStartDate() {
        return LocalDate.now(ZoneOffset.UTC).minusDays(this.days * 2L);
    }

    public LocalDate getCurrentEndDate() {
        return LocalDate.now(ZoneOffset.UTC);
    }

    public OffsetDateTime getCurrentEndOffset() {
        return OffsetDateTime.now(ZoneOffset.UTC);
    }

    public OffsetDateTime getCurrentStartOffset() {
        if (this == ALL_TIME) {
            // Project epoch (e.g., when the platform was launched)
            return OffsetDateTime.of(2024, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC);
        }
        return getCurrentEndOffset().minusDays(this.days);
    }

    public OffsetDateTime getPreviousEndOffset() {
        // Exactly 1 millisecond before the current period starts to prevent overlap
        return getCurrentStartOffset().minusNanos(1000000);
    }

    public OffsetDateTime getPreviousStartOffset() {
        if (this == ALL_TIME) {
            return OffsetDateTime.of(2014, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC);
        }
        return getPreviousEndOffset().minusDays(this.days);
    }
}