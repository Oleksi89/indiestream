package com.indiestream.auth.event;

import com.indiestream.auth.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class UserProfileEventListener {

    private final UserProfileRepository userProfileRepository;

    /**
     * Reacts to follow events asynchronously to prevent blocking the main thread.
     * Uses atomic SQL updates to ensure strict counter accuracy under high concurrency.
     */
    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleUserFollowed(UserFollowedEvent event) {
        userProfileRepository.incrementFollowingCount(event.followerId());
        userProfileRepository.incrementFollowersCount(event.followedId());
    }

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleUserUnfollowed(UserUnfollowedEvent event) {
        userProfileRepository.decrementFollowingCount(event.followerId());
        userProfileRepository.decrementFollowersCount(event.followedId());
    }
}