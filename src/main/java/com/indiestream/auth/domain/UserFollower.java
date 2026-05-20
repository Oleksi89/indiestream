package com.indiestream.auth.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "user_followers")
@Getter
@Setter
@NoArgsConstructor
public class UserFollower {

    @EmbeddedId
    private UserFollowerId id;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    public UserFollower(UserFollowerId id) {
        this.id = id;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }
}