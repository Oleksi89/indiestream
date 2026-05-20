package com.indiestream.auth.service;

import com.indiestream.auth.AuthModuleApi;
import com.indiestream.auth.UserPublicProfile;
import com.indiestream.auth.event.UserRegisteredEvent;
import com.indiestream.auth.domain.Role;
import com.indiestream.auth.domain.User;
import com.indiestream.auth.domain.UserProfile;
import com.indiestream.auth.dto.RegisterRequestDto;
import com.indiestream.auth.dto.UpdateUserProfileRequestDto;
import com.indiestream.auth.dto.UserDto;
import com.indiestream.auth.dto.UserProfileDto;
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
    private final PasswordEncoder passwordEncoder;
    private final ApplicationEventPublisher events;
    private final ProfileStorageService profileStorageService;

    /**
     * Retrieves a user by their UUID.
     * Used primarily for fetching profiles via the Security Principal.
     */
    @Transactional(readOnly = true)
    public Optional<UserDto> getUserById(UUID id) {
        return userRepository.findById(id)
                .map(this::mapToDto);
    }

    @Transactional(readOnly = true)
    public Optional<UserDto> getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .map(this::mapToDto);
    }

    /**
     * Resolves user by username. Evaluates privacy guard.
     */
    @Transactional(readOnly = true)
    public Optional<UserDto> getProfileByUsername(String username, UUID currentUserId) {
        return userRepository.findByUsername(username).map(user -> {
            boolean isOwner = currentUserId != null && currentUserId.equals(user.getId());
            if (user.getProfile().isPrivate() && !isOwner) {
                // Return restricted view or throw AccessDenied. For now, we return empty to trigger 404.
                return null;
            }
            return mapToDto(user);
        });
    }

    @Transactional
    public UserDto register(RegisterRequestDto request) {
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

        return mapToDto(savedUser);
    }

    /**
     * Idempotent update of text metadata.
     */
    @Transactional
    public UserDto updateProfile(UUID userId, UpdateUserProfileRequestDto request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        UserProfile profile = user.getProfile();
        if (request.bio() != null) profile.setBio(request.bio());
        if (request.isPrivate() != null) profile.setPrivate(request.isPrivate());
        if (request.hideSubscriptions() != null) profile.setHideSubscriptions(request.hideSubscriptions());

        return mapToDto(userRepository.save(user));
    }

    @Transactional
    public UserDto updateAvatar(UUID userId, MultipartFile file) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        UserProfile profile = user.getProfile();
        String oldAvatar = profile.getAvatarPath();

        String newAvatarPath = profileStorageService.uploadAvatar(userId, file);
        profile.setAvatarPath(newAvatarPath);

        userRepository.save(user);
        profileStorageService.deleteFile(oldAvatar); // Cleanup MinIO after successful DB save

        return mapToDto(user);
    }

    @Transactional
    public UserDto updateBanner(UUID userId, MultipartFile file) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        UserProfile profile = user.getProfile();
        String oldBanner = profile.getBannerPath();

        String newBannerPath = profileStorageService.uploadBanner(userId, file);
        profile.setBannerPath(newBannerPath);

        userRepository.save(user);
        profileStorageService.deleteFile(oldBanner);

        return mapToDto(user);
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

    private UserDto mapToDto(User user) {
        UserProfileDto profileDto = null;
        if (user.getProfile() != null) {
            profileDto = new UserProfileDto(
                    user.getProfile().getBio(),
                    user.getProfile().getAvatarPath(),
                    user.getProfile().getBannerPath(),
                    user.getProfile().isPrivate(),
                    user.getProfile().isHideSubscriptions(),
                    user.getProfile().getUpdatedAt()
            );
        }

        return new UserDto(
                user.getId(),
                user.getEmail(),
                user.getUsername(),
                user.getAlias(),
                user.getRole(),
                profileDto,
                user.getCreatedAt()
        );
    }
}