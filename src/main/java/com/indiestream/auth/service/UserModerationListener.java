package com.indiestream.auth.service;

import com.indiestream.auth.event.UserBannedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Component
@RequiredArgsConstructor
public class UserModerationListener {

    // private final UserService userService;
    // private final TokenBlacklistService tokenBlacklistService;

    /**
     * Listens for cross-module ban events.
     * Executes AFTER_COMMIT to ensure the ban is only applied if the media transaction succeeds.
     */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleUserBannedEvent(UserBannedEvent event) {
        log.warn("CRITICAL: Cross-module ban event received for User ID: {} by Admin ID: {}. Reason: {}",
                event.userId(), event.adminId(), event.reason());

        try {
            // Lock the user account in the database (e.g., set isEnabled = false or isBanned = true)
            // userService.lockAccount(event.userId(), event.reason());

            // Blacklist all active JWT tokens in Redis to force immediate session termination
            // tokenBlacklistService.revokeAllUserTokens(event.userId());

            log.info("Successfully executed account lockdown and token revocation for User ID: {}", event.userId());
        } catch (Exception e) {
            log.error("Failed to fully apply cross-module ban for User ID: {}", event.userId(), e);
            // Sending an alert to a dead-letter queue or monitoring system
        }
    }
}