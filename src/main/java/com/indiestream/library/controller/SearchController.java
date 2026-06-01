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
     * Unified Global Search endpoint.
     * Flexibly handles text queries, explicit genre filters, and semantic tags.
     *
     * @param query The search term
     * @param genre The search genre
     * @param tags The search tags
     * @param limit Maximum number of items to return PER CATEGORY
     * @return Unified aggregation of results
     */
    @GetMapping
    public ResponseEntity<GlobalSearchResponseDto> search(
            @RequestParam(name = "q", required = false) String query,
            @RequestParam(name = "genre", required = false) String genre,
            @RequestParam(name = "tags", required = false) String tags,
            @RequestParam(name = "limit", defaultValue = "10") int limit
    ) {
        return ResponseEntity.ok(searchAggregationService.globalSearch(query, genre, tags, limit));
    }
}