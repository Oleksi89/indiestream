package com.indiestream.playlist.api;

import com.indiestream.playlist.domain.Playlist;
import com.indiestream.playlist.repository.PlaylistRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PlaylistRecommendationFacadeImpl implements PlaylistRecommendationFacade {

    private final PlaylistRepository playlistRepository;

    @Override
    @Transactional(readOnly = true)
    public Optional<float[]> getPlaylistCentroidVector(UUID playlistId) {
        return playlistRepository.findById(playlistId)
                .map(Playlist::getCentroidVector);
    }
}