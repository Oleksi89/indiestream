package com.indiestream.auth.service;

import com.indiestream.auth.domain.User;
import com.indiestream.auth.domain.UserFollower;
import com.indiestream.auth.domain.UserFollowerId;
import com.indiestream.auth.dto.PageResponse;
import com.indiestream.auth.dto.UserSummaryDto;
import com.indiestream.auth.event.UserFollowedEvent;
import com.indiestream.auth.event.UserUnfollowedEvent;
import com.indiestream.auth.exception.CannotFollowSelfException;
import com.indiestream.auth.repository.UserFollowerRepository;
import com.indiestream.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
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

    /**
     * Retrieves followers enforcing strict Modulith CQRS mapping and privacy guards.
     */
    @Transactional(readOnly = true)
    public PageResponse<UserSummaryDto> getFollowers(String username, UUID currentUserId, Pageable pageable) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        enforcePrivacyGuards(user, currentUserId);

        Page<UserSummaryDto> mappedPage = userRepository.findFollowersByFollowedId(user.getId(), pageable)
                .map(this::mapToSummary);

        return PageResponse.of(mappedPage);
    }

    /**
     * Retrieves following enforcing strict Modulith CQRS mapping and privacy guards.
     */
    @Transactional(readOnly = true)
    public PageResponse<UserSummaryDto> getFollowing(String username, UUID currentUserId, Pageable pageable) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        enforcePrivacyGuards(user, currentUserId);

        Page<UserSummaryDto> mappedPage = userRepository.findFollowingByFollowerId(user.getId(), pageable)
                .map(this::mapToSummary);

        return PageResponse.of(mappedPage);
    }

    /**
     * Prevents access to social graph if the profile is private or subscriptions are hidden.
     */
    private void enforcePrivacyGuards(User targetUser, UUID currentUserId) {
        boolean isOwner = currentUserId != null && currentUserId.equals(targetUser.getId());
        if (isOwner) return; // Owners can always see their own stats

        if (targetUser.getProfile() != null) {
            if (targetUser.getProfile().isPrivate() || targetUser.getProfile().isHideSubscriptions()) {
                throw new AccessDeniedException("This profile's social graph is private.");
            }
        }
    }

    private UserSummaryDto mapToSummary(User user) {
        String avatarPath = user.getProfile() != null ? user.getProfile().getAvatarPath() : null;
        return new UserSummaryDto(
                user.getId(),
                user.getUsername(),
                user.getAlias(),
                avatarPath
        );
    }
}