package com.indiestream.auth.service;

import com.indiestream.auth.domain.User;
import com.indiestream.auth.domain.UserFollower;
import com.indiestream.auth.domain.UserFollowerId;
import com.indiestream.auth.dto.PageResponse;
import com.indiestream.auth.dto.UserDto;
import com.indiestream.auth.dto.UserProfileDto;
import com.indiestream.auth.event.UserFollowedEvent;
import com.indiestream.auth.event.UserUnfollowedEvent;
import com.indiestream.auth.exception.CannotFollowSelfException;
import com.indiestream.auth.repository.UserFollowerRepository;
import com.indiestream.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FollowService {

    private final UserRepository userRepository;
    private final UserFollowerRepository userFollowerRepository;
    private final ApplicationEventPublisher events;

    /**
     * Establishes a follow relationship. Strictly idempotent.
     */
    @Transactional
    public void followUser(UUID followerId, String targetUsername) {
        User targetUser = userRepository.findByUsername(targetUsername)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (followerId.equals(targetUser.getId())) {
            throw new CannotFollowSelfException("Users cannot follow themselves.");
        }

        UserFollowerId relationshipId = new UserFollowerId(followerId, targetUser.getId());

        if (!userFollowerRepository.existsById(relationshipId)) {
            userFollowerRepository.save(new UserFollower(relationshipId));
            events.publishEvent(new UserFollowedEvent(followerId, targetUser.getId()));
        }
    }

    /**
     * Removes a follow relationship. Strictly idempotent.
     */
    @Transactional
    public void unfollowUser(UUID followerId, String targetUsername) {
        User targetUser = userRepository.findByUsername(targetUsername)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        UserFollowerId relationshipId = new UserFollowerId(followerId, targetUser.getId());

        if (userFollowerRepository.existsById(relationshipId)) {
            userFollowerRepository.deleteById(relationshipId);
            events.publishEvent(new UserUnfollowedEvent(followerId, targetUser.getId()));
        }
    }

    @Transactional(readOnly = true)
    public PageResponse<UserDto> getFollowers(String username, Pageable pageable) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Page<UserDto> mappedPage = userRepository.findFollowersByFollowedId(user.getId(), pageable)
                .map(this::mapToDto);

        return PageResponse.of(mappedPage);
    }

    @Transactional(readOnly = true)
    public PageResponse<UserDto> getFollowing(String username, Pageable pageable) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Page<UserDto> mappedPage = userRepository.findFollowingByFollowerId(user.getId(), pageable)
                .map(this::mapToDto);

        return PageResponse.of(mappedPage);
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