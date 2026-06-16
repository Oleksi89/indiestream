package com.indiestream.media.api;

import com.indiestream.media.catalog.dto.TrackSemanticMetadataDto;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Public Gateway for the Recommendation module to interact with Media safely.
 */
public interface MediaRecommendationFacade {
    Optional<TrackSemanticMetadataDto> getTrackSemanticMetadata(UUID trackId);

    boolean hasVector(UUID trackId);

    void updateTrackVector(UUID trackId, float[] vector);

    Optional<float[]> getTrackVector(UUID trackId);

    Slice<UUID> getTrackIdsForRecommendationIndexing(Pageable pageable);

    List<UUID> getExistingTrackIds(List<UUID> requestedIds);
}