package com.indiestream.auth.controller;

import com.indiestream.auth.dto.PageResponse;
import com.indiestream.auth.dto.UserDto;
import com.indiestream.auth.dto.UserSummaryDto;
import com.indiestream.auth.service.FollowService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users/{username}")
@RequiredArgsConstructor
public class FollowController {

    private final FollowService followService;

    @PostMapping("/follow")
    public ResponseEntity<Void> follow(@PathVariable String username, Principal principal) {
        followService.followUser(extractId(principal), username);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/follow")
    public ResponseEntity<Void> unfollow(@PathVariable String username, Principal principal) {
        followService.unfollowUser(extractId(principal), username);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/followers")
    public ResponseEntity<PageResponse<UserSummaryDto>> getFollowers(
            @PathVariable String username,
            @PageableDefault(size = 20) Pageable pageable,
            Principal principal) {
        return ResponseEntity.ok(followService.getFollowers(username, extractId(principal), pageable));
    }

    @GetMapping("/following")
    public ResponseEntity<PageResponse<UserSummaryDto>> getFollowing(
            @PathVariable String username,
            @PageableDefault(size = 20) Pageable pageable,
            Principal principal) {
        return ResponseEntity.ok(followService.getFollowing(username, extractId(principal), pageable));
    }

    private UUID extractId(Principal principal) {
        return UUID.fromString(principal.getName());
    }
}