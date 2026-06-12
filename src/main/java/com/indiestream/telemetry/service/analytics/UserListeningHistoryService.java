package com.indiestream.telemetry.service.analytics;

import com.indiestream.auth.AuthModuleApi;
import com.indiestream.auth.UserPublicProfile;
import com.indiestream.shared.dto.PageResponse;
import com.indiestream.telemetry.dto.analytics.ListeningHistoryItemDto;
import com.indiestream.telemetry.repository.AnalyticsQueryRepository;
import com.indiestream.telemetry.repository.projection.HistoryTrackProjection;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Handles the extraction and mapping of user-specific behavioral streams.
 */
@Service
@RequiredArgsConstructor
public class UserListeningHistoryService {

    private final AnalyticsQueryRepository queryRepository;
    private final AuthModuleApi authModuleApi;

    public PageResponse<ListeningHistoryItemDto> getUserHistory(UUID userId, Pageable pageable) {
        long totalElements = queryRepository.getUserListeningHistoryCount(userId);

        List<HistoryTrackProjection> projections = queryRepository.getUserListeningHistory(
                userId, pageable.getPageSize(), pageable.getOffset());

        List<ListeningHistoryItemDto> content = projections.stream().map(p -> {
            UserPublicProfile artistProfile = authModuleApi.getUserPublicProfile(p.artistId()).orElse(null);
            String username = artistProfile != null ? artistProfile.username() : "unavailable";
            String alias = artistProfile != null ? artistProfile.alias() : "Unknown Artist";

            return new ListeningHistoryItemDto(
                    new ListeningHistoryItemDto.TrackDetails(
                            p.trackId(), p.artistId(), username, alias,
                            p.title(), p.coverMinioPath(), p.durationSeconds(),
                            p.status(), p.genre(), p.isExplicit()
                    ),
                    p.lastPlayedAt(),
                    p.totalListenedTimeMs()
            );
        }).collect(Collectors.toList());

        int totalPages = (int) Math.ceil((double) totalElements / pageable.getPageSize());

        return new PageResponse<>(
                content,
                pageable.getPageNumber(),
                pageable.getPageSize(),
                totalElements,
                totalPages,
                pageable.getPageNumber() == totalPages - 1
        );
    }
}