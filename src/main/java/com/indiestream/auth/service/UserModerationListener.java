package com.indiestream.auth.service;

import com.indiestream.auth.event.UserBannedEvent;
import com.indiestream.auth.event.UserUnbanRequestedEvent;
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

    private final UserService userService;

    /**
     * Listens for cross-module ban events.
     * Executes AFTER_COMMIT to ensure the ban is only applied if the media transaction succeeds.
     */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleUserBannedEvent(UserBannedEvent event) {
        log.warn("CRITICAL: Cross-module ban event executing for User ID: {}. Reason: {}",
                event.userId(), event.reason());
        try {
            userService.banUser(event.userId(), event.adminId(), event.reason());
            log.info("Account lockdown successful for User ID: {}", event.userId());
        } catch (Exception e) {
            log.error("Failed to apply DB lockdown for User ID: {}", event.userId(), e);
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleUserUnbanRequestedEvent(UserUnbanRequestedEvent event) {
        log.warn("Cross-module UNBAN event executing for User ID: {}", event.userId());
        try {
            userService.unbanUser(event.userId(), event.adminId(), event.reason());
            log.info("Account restoration successful for User ID: {}", event.userId());
        } catch (Exception e) {
            log.error("Failed to apply DB restoration for User ID: {}", event.userId(), e);
        }
    }
}