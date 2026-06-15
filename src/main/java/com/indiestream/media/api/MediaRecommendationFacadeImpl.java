package com.indiestream.media.api;

import com.indiestream.media.api.dto.TrackSemanticMetadataDto;
import com.indiestream.media.catalog.domain.Track;
import com.indiestream.media.catalog.domain.TrackStatus;
import com.indiestream.media.catalog.domain.TrackTags;
import com.indiestream.media.catalog.repository.TrackRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class MediaRecommendationFacadeImpl implements MediaRecommendationFacade {

    private final TrackRepository trackRepository;

    private static final Set<TrackStatus> INDEXABLE_STATUSES = Set.of(
            TrackStatus.APPROVED,
            TrackStatus.PUBLISHED,
            TrackStatus.HIDDEN
    );

    @Override
    public Optional<TrackSemanticMetadataDto> getTrackSemanticMetadata(UUID trackId) {
        return trackRepository.findById(trackId).map(track -> {
            TrackTags tags = track.getTags() != null ? track.getTags() : TrackTags.empty();
            String tempo = track.getStemsMetadata().getOrDefault("tempo", "Unknown Tempo");
            return new TrackSemanticMetadataDto(track.getGenre(), tempo, tags.moods(), tags.aiGenerated(), tags.custom());
        });
    }

    @Override
    public boolean hasVector(UUID trackId) {
        return trackRepository.findById(trackId).map(Track::getVector).orElse(null) != null;
    }

    @Override
    @Transactional
    public void updateTrackVector(UUID trackId, float[] vector) {
        trackRepository.updateTrackVector(trackId, vector);
    }

    @Override
    public Optional<float[]> getTrackVector(UUID trackId) {
        return trackRepository.findById(trackId).map(Track::getVector);
    }

    @Override
    public Slice<UUID> getTrackIdsForRecommendationIndexing(Pageable pageable) {
        return trackRepository.findAllIdsByStatusIn(INDEXABLE_STATUSES, pageable);
    }

    @Override
    public List<UUID> getExistingTrackIds(List<UUID> requestedIds) {
        return trackRepository.findAllById(requestedIds).stream().map(Track::getId).toList();
    }
}