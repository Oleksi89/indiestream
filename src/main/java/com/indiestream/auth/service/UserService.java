package com.indiestream.auth.service;

import com.indiestream.auth.AuthModuleApi;
import com.indiestream.auth.UserRegisteredEvent;
import com.indiestream.auth.domain.Role;
import com.indiestream.auth.domain.User;
import com.indiestream.auth.dto.RegisterRequestDto;
import com.indiestream.auth.dto.UserDto;
import com.indiestream.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.indiestream.auth.exception.EmailAlreadyInUseException;

import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService implements AuthModuleApi {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ApplicationEventPublisher events;

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
     * Registers a new user with USER role.
     * * @param request Contains raw credentials.
     *
     * @return UserDto representing the persisted user.
     * @throws EmailAlreadyInUseException if the provided email exists in the system.
     */
    @Transactional
    public UserDto register(RegisterRequestDto request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new EmailAlreadyInUseException("Email is already in use.");
        }

        User user = new User();
        user.setEmail(request.email());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(Role.USER);

        User savedUser = userRepository.save(user);

        events.publishEvent(new UserRegisteredEvent(savedUser.getId()));

        return mapToDto(savedUser);
    }

    @Override
    @Transactional(readOnly = true)
    public String getUserEmail(UUID userId) {
        return userRepository.findById(userId)
                .map(User::getEmail)
                .orElse("Unknown Artist");
    }


    private UserDto mapToDto(User user) {
        return new UserDto(
                user.getId(),
                user.getEmail(),
                user.getRole(),
                user.getCreatedAt()
        );
    }
}