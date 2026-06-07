package com.indiestream.auth.repository;

import com.indiestream.auth.domain.UserModerationLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface UserModerationLogRepository extends JpaRepository<UserModerationLog, UUID> {
    List<UserModerationLog> findAllByUserIdOrderByCreatedAtDesc(UUID userId);
}