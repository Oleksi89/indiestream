package com.indiestream.auth.service;

import com.indiestream.auth.domain.Role;
import com.indiestream.auth.domain.User;
import com.indiestream.auth.dto.RegisterRequestDto;
import com.indiestream.auth.dto.UserDto;
import com.indiestream.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public Optional<UserDto> getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .map(this::mapToDto);
    }

    /**
     * Registers a new user with USER role.
     * @param request Contains raw credentials.
     * @return UserDto representing the persisted user.
     * // TODO: [Auth] - Implement standardized RFC 7807 exception for email conflicts.
     */
    @Transactional
    public UserDto register(RegisterRequestDto request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email is already in use.");
        }

        User user = new User();
        user.setEmail(request.email());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(Role.USER);

        User savedUser = userRepository.save(user);
        return mapToDto(savedUser);
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