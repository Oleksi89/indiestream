package com.indiestream.auth.controller;

import com.indiestream.auth.dto.UpdateUserProfileRequestDto;
import com.indiestream.auth.dto.UserDto;
import com.indiestream.auth.service.UserService;
import lombok.RequiredArgsConstructor;
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
    public ResponseEntity<UserDto> getProfile(@PathVariable String username, Principal principal) {
        UUID requesterId = principal != null ? extractId(principal) : null;
        return userService.getProfileByUsername(username, requesterId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/me/profile")
    public ResponseEntity<UserDto> updateProfile(@RequestBody UpdateUserProfileRequestDto request, Principal principal) {
        return ResponseEntity.ok(userService.updateProfile(extractId(principal), request));
    }

    @PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UserDto> updateAvatar(@RequestParam("file") MultipartFile file, Principal principal) {
        return ResponseEntity.ok(userService.updateAvatar(extractId(principal), file));
    }

    @PostMapping(value = "/me/banner", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UserDto> updateBanner(@RequestParam("file") MultipartFile file, Principal principal) {
        return ResponseEntity.ok(userService.updateBanner(extractId(principal), file));
    }

    private UUID extractId(Principal principal) {
        return UUID.fromString(principal.getName());
    }
}