package com.indiestream.library.controller;

import com.indiestream.library.dto.GlobalSearchResponseDto;
import com.indiestream.library.service.SearchAggregationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/search")
@RequiredArgsConstructor
public class SearchController {

    private final SearchAggregationService searchAggregationService;

    /**
     * Executes a global text search across tracks, playlists, and user profiles.
     *
     * @param query The search term
     * @param limit Maximum number of items to return PER CATEGORY
     * @return Unified aggregation of results
     */
    @GetMapping
    public ResponseEntity<GlobalSearchResponseDto> search(
            @RequestParam(name = "q") String query,
            @RequestParam(name = "limit", defaultValue = "10") int limit
    ) {
        return ResponseEntity.ok(searchAggregationService.globalSearch(query, limit));
    }

    /**
     * Executes a strict semantic search matching exact GIN-indexed tags.
     * Used primarily for mood, genre, and AI-generated metadata discovery.
     *
     * @param tags  Comma-separated list of tags (e.g., "electronic,upbeat,synth")
     * @param limit Maximum number of items to return
     * @return Unified aggregation of results
     */
    @GetMapping("/tags")
    public ResponseEntity<GlobalSearchResponseDto> searchByTags(
            @RequestParam(name = "tags") String tags,
            @RequestParam(name = "limit", defaultValue = "20") int limit
    ) {
        return ResponseEntity.ok(searchAggregationService.searchByTags(tags, limit));
    }
}