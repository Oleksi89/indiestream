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

    public OffsetDateTime getCurrentStartOffset() {
        return OffsetDateTime.now(ZoneOffset.UTC).minusDays(this.days);
    }

    public OffsetDateTime getCurrentEndOffset() {
        return OffsetDateTime.now(ZoneOffset.UTC);
    }
}