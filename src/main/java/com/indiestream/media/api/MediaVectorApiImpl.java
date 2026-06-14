package com.indiestream.media.api;

import com.indiestream.media.catalog.domain.Track;
import com.indiestream.media.catalog.repository.TrackRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MediaVectorApiImpl implements MediaVectorApi {

    private final TrackRepository trackRepository;

    @Override
    public Optional<float[]> getTrackVector(UUID trackId) {
        return trackRepository.findById(trackId).map(Track::getVector);
    }
}