package com.indiestream.recommendation.service;

import com.indiestream.media.api.TrackUploadedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class RecommendationListener {

    @Async
    @EventListener
    public void handleTrackUploadedEvent(TrackUploadedEvent event) {
        System.out.println("Track uploaded! Updating recommendations for ID: " + event.trackId());
    }
}