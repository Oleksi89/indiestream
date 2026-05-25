package com.indiestream.auth.service;

import com.indiestream.auth.AuthModuleApi;
import com.indiestream.auth.FollowedUserProfileProjection;
import com.indiestream.auth.UserPublicProfile;
import com.indiestream.auth.domain.Role;
import com.indiestream.auth.domain.User;
import com.indiestream.auth.domain.UserProfile;
import com.indiestream.auth.dto.*;
import com.indiestream.auth.event.UserRegisteredEvent;
import com.indiestream.auth.repository.UserFollowerRepository;
import com.indiestream.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.indiestream.auth.exception.EmailAlreadyInUseException;
import com.indiestream.auth.exception.UsernameAlreadyInUseException;
import org.springframework.web.multipart.MultipartFile;

import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService implements AuthModuleApi {

    private final UserRepository userRepository;
    private final UserFollowerRepository followerRepository;
    private final PasswordEncoder passwordEncoder;
    private final ApplicationEventPublisher events;
    private final ProfileStorageService profileStorageService;

    /**
     * Retrieves a user by their UUID.
     * Uses fast-path mapping since the authenticated user is requesting themselves.
     */
    @Transactional(readOnly = true)
    public Optional<UserDto> getUserById(UUID id) {
        return userRepository.findById(id).map(this::mapToBasicDto);
    }

    @Transactional(readOnly = true)
    public Optional<UserDto> getUserByEmail(String email) {
        return userRepository.findByEmail(email).map(this::mapToBasicDto);
    }

    /**
     * Resolves user by username. Evaluates privacy guard and populates the View Model.
     */
    @Transactional(readOnly = true)
    public Optional<UserProfileResponse> getProfileByUsername(String username, UUID currentUserId) {
        return userRepository.findByUsername(username).map(user -> mapToProfileResponse(user, currentUserId));
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isProfileAccessible(UUID targetUserId, UUID currentUserId) {
        if (currentUserId != null && currentUserId.equals(targetUserId)) return true;
        return userRepository.findById(targetUserId)
                .map(u -> u.getProfile() == null || !u.getProfile().isPrivate())
                .orElse(false);
    }

    /**
     * Registers a new user and provisions an empty profile.
     * Bypasses social graph DB queries entirely during initialization.
     */
    @Transactional
    public UserProfileResponse register(RegisterRequestDto request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new EmailAlreadyInUseException("Email is already in use.");
        }

        if (userRepository.existsByUsername(request.username())) {
            throw new UsernameAlreadyInUseException("Username is already taken.");
        }

        User user = new User();
        user.setEmail(request.email());
        user.setUsername(request.username());
        user.setAlias(request.alias());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(Role.USER);

        UserProfile profile = new UserProfile();
        user.setProfile(profile);

        User savedUser = userRepository.save(user);

        events.publishEvent(new UserRegisteredEvent(
                savedUser.getId(),
                savedUser.getUsername(),
                savedUser.getAlias()
        ));

        return mapToProfileResponse(savedUser, savedUser.getId());
    }

    /**
     * Idempotent update of text metadata.
     */
    @Transactional
    public UserProfileResponse updateProfile(UUID userId, UpdateUserProfileRequestDto request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (request.alias() != null && !request.alias().isBlank()) {
            user.setAlias(request.alias());
        }

        UserProfile profile = user.getProfile();
        if (request.bio() != null) profile.setBio(request.bio());
        if (request.isPrivate() != null) profile.setPrivate(request.isPrivate());
        if (request.hideSubscriptions() != null) profile.setHideSubscriptions(request.hideSubscriptions());

        return mapToProfileResponse(userRepository.save(user), userId);
    }

    @Transactional
    public UserProfileResponse updateAvatar(UUID userId, MultipartFile file) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        UserProfile profile = user.getProfile();
        String oldAvatar = profile.getAvatarPath();

        String newAvatarPath = profileStorageService.uploadAvatar(userId, file);
        profile.setAvatarPath(newAvatarPath);

        userRepository.save(user);
        profileStorageService.deleteFile(oldAvatar);

        return mapToProfileResponse(user, userId);
    }

    @Transactional
    public UserProfileResponse updateBanner(UUID userId, MultipartFile file) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        UserProfile profile = user.getProfile();
        String oldBanner = profile.getBannerPath();

        String newBannerPath = profileStorageService.uploadBanner(userId, file);
        profile.setBannerPath(newBannerPath);

        userRepository.save(user);
        profileStorageService.deleteFile(oldBanner);

        return mapToProfileResponse(user, userId);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<UserPublicProfile> getUserPublicProfile(UUID userId) {
        return userRepository.findById(userId)
                .map(user -> new UserPublicProfile(
                        user.getId(),
                        user.getUsername(),
                        user.getAlias()
                ));
    }

    @Override
    @Transactional(readOnly = true)
    public String getUserEmail(UUID userId) {
        return userRepository.findById(userId)
                .map(User::getEmail)
                .orElse("Unknown User");
    }

    @Override
    @Transactional(readOnly = true)
    public java.util.List<FollowedUserProfileProjection> getFollowedProfilesForLibrary(UUID followerId) {
        return followerRepository.findFollowedProfilesForLibrary(followerId);
    }

    @Override
    @Transactional(readOnly = true)
    public java.util.Map<UUID, String> getUserAliases(java.util.Set<UUID> userIds) {
        if (userIds == null || userIds.isEmpty()) return java.util.Collections.emptyMap();

        java.util.List<Object[]> results = userRepository.findAliasesByIds(userIds);
        return results.stream().collect(java.util.stream.Collectors.toMap(
                row -> (UUID) row[0],
                row -> (String) row[1]
        ));
    }

    private UserDto mapToBasicDto(User user) {
        return new UserDto(
                user.getId(),
                user.getEmail(),
                user.getUsername(),
                user.getAlias(),
                user.getRole(),
                extractProfileDto(user),
                user.getCreatedAt()
        );
    }

    /**
     * Maps Entity to View Model Response with short-circuit social state verification.
     */
    private UserProfileResponse mapToProfileResponse(User user, UUID currentUserId) {
        // Fast-path optimization: avoid DB query if anonymous or checking own profile
        boolean isFollowed = currentUserId != null
                && !currentUserId.equals(user.getId())
                && followerRepository.existsByIdFollowerIdAndIdFollowedId(currentUserId, user.getId());

        return new UserProfileResponse(
                user.getId(),
                user.getEmail(),
                user.getUsername(),
                user.getAlias(),
                user.getRole(),
                extractProfileDto(user),
                user.getCreatedAt(),
                user.getProfile() != null ? user.getProfile().getFollowersCount() : 0L,
                user.getProfile() != null ? user.getProfile().getFollowingCount() : 0L,
                isFollowed
        );
    }

    private UserProfileDto extractProfileDto(User user) {
        if (user.getProfile() == null) return null;
        return new UserProfileDto(
                user.getProfile().getBio(),
                user.getProfile().getAvatarPath(),
                user.getProfile().getBannerPath(),
                user.getProfile().isPrivate(),
                user.getProfile().isHideSubscriptions(),
                user.getProfile().getUpdatedAt()
        );
    }
}