package com.indiestream.auth.controller;

import com.indiestream.auth.dto.UpdateUserProfileRequestDto;
import com.indiestream.auth.dto.UserDto;
import com.indiestream.auth.dto.UserProfileResponse;
import com.indiestream.auth.service.ProfileStorageService;
import com.indiestream.auth.service.UserService;
import io.minio.StatObjectResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
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

    private UUID extractId(Principal principal) {
        return UUID.fromString(principal.getName());
    }
}