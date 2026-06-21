package com.indiestream.auth.service;

import com.indiestream.auth.AuthModuleApi;
import com.indiestream.auth.FollowedUserProfileProjection;
import com.indiestream.auth.UserPublicProfile;
import com.indiestream.auth.domain.Role;
import com.indiestream.auth.domain.User;
import com.indiestream.auth.domain.UserProfile;
import com.indiestream.auth.domain.UserModerationLog;
import com.indiestream.auth.dto.*;
import com.indiestream.auth.event.UserBannedEvent;
import com.indiestream.auth.event.UserRegisteredEvent;
import com.indiestream.auth.event.UserUnbannedEvent;
import com.indiestream.auth.exception.InvalidCurrentPasswordException;
import com.indiestream.auth.repository.UserFollowerRepository;
import com.indiestream.auth.repository.UserModerationLogRepository;
import com.indiestream.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.indiestream.auth.exception.EmailAlreadyInUseException;
import com.indiestream.auth.exception.UsernameAlreadyInUseException;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService implements AuthModuleApi {

    private final UserRepository userRepository;
    private final UserFollowerRepository followerRepository;
    private final UserModerationLogRepository moderationLogRepository;
    private final TokenBlacklistService tokenBlacklistService;
    private final PasswordEncoder passwordEncoder;
    private final ApplicationEventPublisher events;
    private final ProfileStorageService profileStorageService;

    /**
     * Retrieves a user by their UUID.
     * Uses fast-path mapping since the authenticated user is requesting themselves.
     */
    @Transactional(readOnly = true)
    public Optional<UserDto> getUserById(UUID id) {
        return userRepository.findById(id)
                .filter(user -> !user.getIsBanned())
                .map(this::mapToBasicDto);
    }

    @Transactional(readOnly = true)
    public Optional<UserDto> getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .filter(user -> !user.getIsBanned())
                .map(this::mapToBasicDto);
    }

    /**
     * Resolves user by username. Evaluates privacy guard and populates the View Model.
     */
    @Transactional(readOnly = true)
    public Optional<UserProfileResponse> getProfileByUsername(String username, UUID currentUserId) {
        return userRepository.findByUsername(username)
                .filter(user -> !user.getIsBanned())
                .map(user -> mapToProfileResponse(user, currentUserId));
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isProfileAccessible(UUID targetUserId, UUID currentUserId) {
        if (currentUserId != null && currentUserId.equals(targetUserId)) {
            return userRepository.findById(targetUserId)
                    .map(u -> !u.getIsBanned())
                    .orElse(false);
        }
        return userRepository.findById(targetUserId)
                .map(u -> !u.getIsBanned() && (u.getProfile() == null || !u.getProfile().isPrivate()))
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

        Role assignedRole = "ARTIST".equals(request.role()) ? Role.ARTIST : Role.USER;
        user.setRole(assignedRole);

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
     * Updates the user's password and resets all active sessions for security reasons.
     */
    @Transactional
    public void changePassword(UUID userId, ChangePasswordRequestDto request) {
        if (request.currentPassword().equals(request.newPassword())) {
            throw new IllegalArgumentException("New password cannot be the same as the current password.");
        }

        User user = userRepository.findById(userId)
                .filter(u -> !u.getIsBanned())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new InvalidCurrentPasswordException("Current password is incorrect.");
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
    }

    /**
     * Idempotent update of text metadata.
     */
    @Transactional
    public UserProfileResponse updateProfile(UUID userId, UpdateUserProfileRequestDto request) {
        User user = userRepository.findById(userId)
                .filter(u -> !u.getIsBanned())
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
                .filter(u -> !u.getIsBanned())
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
                .filter(u -> !u.getIsBanned())
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
                .filter(user -> !user.getIsBanned())
                .map(this::mapToPublicProfile);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<UserPublicProfile> getUserPublicProfileByUsername(String username) {
        return userRepository.findByUsername(username)
                .filter(user -> !user.getIsBanned())
                .map(this::mapToPublicProfile);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserPublicProfile> getPublicProfiles(Set<UUID> userIds) {
        if (userIds == null || userIds.isEmpty()) return List.of();
        return userRepository.findAllByIdIn(userIds).stream()
                .filter(user -> !user.getIsBanned())
                .map(this::mapToPublicProfile)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public String getUserEmail(UUID userId) {
        return userRepository.findById(userId)
                .filter(user -> !user.getIsBanned())
                .map(User::getEmail)
                .orElse("Unknown User");
    }

    @Override
    @Transactional(readOnly = true)
    public List<FollowedUserProfileProjection> getFollowedProfilesForLibrary(UUID followerId) {
        return followerRepository.findFollowedProfilesForLibrary(followerId);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<UUID, String> getUserAliases(Set<UUID> userIds) {
        if (userIds == null || userIds.isEmpty()) return Collections.emptyMap();

        List<Object[]> results = userRepository.findAliasesByIds(userIds);
        Map<UUID, String> aliasMap = new HashMap<>();
        for (Object[] row : results) {
            UUID id = (UUID) row[0];
            userRepository.findById(id).filter(u -> !u.getIsBanned()).ifPresent(u -> {
                aliasMap.put(id, (String) row[1]);
            });
        }
        return aliasMap;
    }

    /**
     * Core Autocomplete engine executed securely behind the module boundary.
     * Limits to 5 hits to prevent UI layout breakage and DB strain.
     */
    @Transactional(readOnly = true)
    public List<UserPublicProfile> searchUsersAutocomplete(String query) {
        return userRepository.searchByUsernameOrAliasWithProfile(query, PageRequest.of(0, 5))
                .stream()
                .map(this::mapToPublicProfile)
                .collect(Collectors.toList());
    }

    /**
     * Cross-module robust search implementation.
     * Enforces sorting via lexicographical Role comparison (ARTIST < USER),
     * followed by audience size (followersCount).
     */
    @Override
    @Transactional(readOnly = true)
    public Page<UserPublicProfile> searchPublicProfiles(String query, Pageable pageable) {
        if (query == null || query.isBlank()) {
            return Page.empty(pageable);
        }

        Pageable effectivePageable = pageable.getSort().isUnsorted()
                ? PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
                Sort.by(Sort.Order.asc("role"), Sort.Order.desc("profile.followersCount")))
                : pageable;

        List<User> users = userRepository.searchPublicProfilesByUsernameOrAlias(query, effectivePageable);
        List<UserPublicProfile> profiles = users.stream().map(this::mapToPublicProfile).toList();

        return new PageImpl<>(profiles, effectivePageable, profiles.size());
    }

    /**
     * Resolves a paginated list of users for administrative dashboards.
     * * @param query    Optional search term matching ID, username, alias, or email.
     *
     * @param isBanned Optional filter for ban status. Null evaluates to all users.
     * @param pageable Pagination and sorting configuration.
     * @return Paginated result of flattened user profiles.
     */
    @Transactional(readOnly = true)
    public Page<AdminUserViewDto> getAdminUsers(String query, Boolean isBanned, Pageable pageable) {
        Page<User> usersPage = userRepository.searchForAdmin(query, isBanned, pageable);

        return usersPage.map(user -> new AdminUserViewDto(
                user.getId(),
                user.getEmail(),
                user.getUsername(),
                user.getAlias(),
                user.getRole(),
                user.getIsBanned(),
                user.getProfile() != null ? user.getProfile().getAvatarPath() : null,
                user.getCreatedAt()
        ));
    }

    @Transactional
    public void banUser(UUID userId, UUID adminId, String reason) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (user.getRole() == Role.ADMIN) {
            throw new IllegalArgumentException("Administrative accounts cannot be suspended.");
        }

        if (user.getIsBanned()) return;

        user.setIsBanned(true);
        userRepository.save(user);

        UserModerationLog logEntry = UserModerationLog.builder()
                .userId(userId)
                .adminId(adminId)
                .action("BAN")
                .reason(reason)
                .build();
        moderationLogRepository.save(logEntry);

        tokenBlacklistService.revokeUserSessions(userId);

        events.publishEvent(new UserBannedEvent(userId, user.getRole().name(), adminId, reason, Instant.now()));
    }

    @Transactional
    public void unbanUser(UUID userId, UUID adminId, String reason) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (!user.getIsBanned()) return;

        user.setIsBanned(false);
        userRepository.save(user);

        UserModerationLog logEntry = UserModerationLog.builder()
                .userId(userId)
                .adminId(adminId)
                .action("UNBAN")
                .reason(reason)
                .build();
        moderationLogRepository.save(logEntry);

        tokenBlacklistService.restoreUserSessions(userId);

        events.publishEvent(new UserUnbannedEvent(userId, adminId, reason, Instant.now()));
    }

    private UserPublicProfile mapToPublicProfile(User user) {
        return new UserPublicProfile(
                user.getId(),
                user.getUsername(),
                user.getAlias(),
                user.getProfile() != null ? user.getProfile().getAvatarPath() : null
        );
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
                user.getProfile().getTasteVector() == null,
                user.getProfile().getUpdatedAt()
        );
    }


    // --- EPIC 6: Recommendation Engine Integrations ---

    @Override
    @Transactional(readOnly = true)
    public boolean profileExists(UUID userId) {
        return userRepository.existsById(userId);
    }

    @Override
    @Transactional(readOnly = true)
    public float[] getTasteVector(UUID userId) {
        return userRepository.findById(userId)
                .filter(u -> !u.getIsBanned())
                .map(User::getProfile)
                .map(UserProfile::getTasteVector)
                .orElse(null);
    }

    @Override
    @Transactional
    public void updateTasteVector(UUID userId, float[] vector) {
        userRepository.findById(userId).ifPresent(user -> {
            if (user.getProfile() != null && !user.getIsBanned()) {
                user.getProfile().setTasteVector(vector);
                // Dirty checking will automatically update the database
            }
        });
    }

    @Override
    @Transactional
    public void clearTasteVector(UUID userId) {
        userRepository.findById(userId).ifPresent(user -> {
            if (user.getProfile() != null) {
                user.getProfile().setTasteVector(null);
            }
        });
    }
}