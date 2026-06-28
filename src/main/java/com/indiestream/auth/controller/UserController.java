package com.indiestream.auth.controller;

import com.indiestream.auth.UserPublicProfile;
import com.indiestream.auth.dto.*;
import com.indiestream.auth.service.ProfileStorageService;
import com.indiestream.auth.service.UserService;
import io.minio.StatObjectResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

/**
 * Handles user-specific data retrieval and profile management.
 */
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final ProfileStorageService profileStorageService;

    /**
     * Retrieves the profile of the currently authenticated user.
     * Extracts the UUID directly from the Security Principal to respect Modulith boundaries.
     *
     * @param principal Injected principal from SecurityContext containing the user UUID string.
     * @return UserDto containing public profile information.
     */
    @GetMapping("/me")
    public ResponseEntity<UserDto> getCurrentUser(Principal principal) {
        return userService.getUserById(extractId(principal))
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Resolves a profile publicly. Subject to visibility constraints defined in the service tier.
     */
    @GetMapping("/{username}/profile")
    public ResponseEntity<UserProfileResponse> getProfile(@PathVariable String username, Principal principal) {
        UUID requesterId = principal != null ? extractId(principal) : null;
        return userService.getProfileByUsername(username, requesterId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/autocomplete")
    public ResponseEntity<List<UserPublicProfile>> autocompleteUsers(@RequestParam("q") String query) {
        if (query == null || query.isBlank()) {
            return ResponseEntity.ok(List.of());
        }
        return ResponseEntity.ok(userService.searchUsersAutocomplete(query));
    }

    @PutMapping("/me/password")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody ChangePasswordRequestDto request, Principal principal) {
        userService.changePassword(extractId(principal), request);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/me/profile")
    public ResponseEntity<UserProfileResponse> updateProfile(@RequestBody UpdateUserProfileRequestDto request, Principal principal) {
        return ResponseEntity.ok(userService.updateProfile(extractId(principal), request));
    }

    @PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UserProfileResponse> updateAvatar(@RequestParam("file") MultipartFile file, Principal principal) {
        return ResponseEntity.ok(userService.updateAvatar(extractId(principal), file));
    }

    @PostMapping(value = "/me/banner", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UserProfileResponse> updateBanner(@RequestParam("file") MultipartFile file, Principal principal) {
        return ResponseEntity.ok(userService.updateBanner(extractId(principal), file));
    }

    /**
     * Proxies the avatar image securely via the backend.
     */
    @GetMapping("/{username}/avatar")
    public ResponseEntity<InputStreamResource> getAvatar(@PathVariable String username) {
        UserProfileResponse user = userService.getProfileByUsername(username, null)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (user.profile() == null || user.profile().avatarPath() == null) {
            return ResponseEntity.notFound().build();
        }


        StatObjectResponse metadata = profileStorageService.getObjectMetadata(user.profile().avatarPath());
        InputStreamResource resource = new InputStreamResource(
                profileStorageService.getObjectStream(user.profile().avatarPath())
        );

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(metadata.contentType()))
                .contentLength(metadata.size())
                .body(resource);
    }

    /**
     * Proxies the banner image securely via the backend.
     */
    @GetMapping("/{username}/banner")
    public ResponseEntity<InputStreamResource> getBanner(@PathVariable String username) {
        UserProfileResponse user = userService.getProfileByUsername(username, null)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (user.profile() == null || user.profile().bannerPath() == null) {
            return ResponseEntity.notFound().build();
        }

        StatObjectResponse metadata = profileStorageService.getObjectMetadata(user.profile().bannerPath());
        InputStreamResource resource = new InputStreamResource(
                profileStorageService.getObjectStream(user.profile().bannerPath())
        );

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(metadata.contentType()))
                .contentLength(metadata.size())
                .body(resource);
    }

    /**
     * Administrative endpoint to list and filter users.
     *
     * @param q        Optional search query (matches id, username, email, alias).
     * @param isBanned Optional status filter (true = banned, false = active, null = all).
     * @param pageable Standard Spring Data pagination and sorting.
     */
    @GetMapping("/admin/search")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<AdminUserViewDto>> getAdminUsers(
            @RequestParam(value = "q", required = false) String q,
            @RequestParam(value = "isBanned", required = false) Boolean isBanned,
            Pageable pageable) {
        return ResponseEntity.ok(userService.getAdminUsers(q, isBanned, pageable));
    }

    /**
     * Administrative Action: Bans a user globally across the system.
     */
    @PostMapping("/admin/{userId}/ban")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> banUser(
            @PathVariable("userId") UUID userId,
            @RequestParam String reason,
            Principal principal) {

        UUID adminId = extractId(principal);
        userService.banUser(userId, adminId, reason);
        return ResponseEntity.noContent().build();
    }

    /**
     * Administrative Action: Unbans a user.
     */
    @PostMapping("/admin/{userId}/unban")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> unbanUser(
            @PathVariable("userId") UUID userId,
            @RequestParam String reason,
            Principal principal) {

        UUID adminId = extractId(principal);
        userService.unbanUser(userId, adminId, reason);
        return ResponseEntity.noContent().build();
    }



    private UUID extractId(Principal principal) {
        return UUID.fromString(principal.getName());
    }
}