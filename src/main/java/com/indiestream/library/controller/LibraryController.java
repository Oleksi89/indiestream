package com.indiestream.library.controller;

import com.indiestream.library.dto.LibraryItemDto;
import com.indiestream.library.service.LibraryAggregationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/library")
@RequiredArgsConstructor
public class LibraryController {

    private final LibraryAggregationService libraryAggregationService;

    /**
     * Serves the aggregated, polymorphic timeline of all items saved in the user's library.
     * Engineered specifically for sidebar consumption to prevent network waterfalls.
     */
    @GetMapping("/me")
    public ResponseEntity<List<LibraryItemDto>> getMyLibrary(Principal principal) {
        UUID userId = UUID.fromString(principal.getName());
        List<LibraryItemDto> library = libraryAggregationService.getUserLibrary(userId);
        return ResponseEntity.ok(library);
    }
}