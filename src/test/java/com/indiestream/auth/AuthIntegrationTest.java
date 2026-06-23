package com.indiestream.auth;

import com.indiestream.IntegrationTestBase;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@AutoConfigureMockMvc
class AuthIntegrationTest extends IntegrationTestBase {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("Should successfully register a new valid user and return 201 Created")
    void shouldRegisterValidUser() throws Exception {
        String validPayload = """
                {
                    "email": "newuser@test.com",
                    "username": "new_user_123",
                    "alias": "New User",
                    "password": "securePassword123",
                    "role": "USER"
                }
                """;

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validPayload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("newuser@test.com"))
                .andExpect(jsonPath("$.username").value("new_user_123"))
                // Ensure password is not leaked in the response
                .andExpect(jsonPath("$.password").doesNotExist());
    }

    @ParameterizedTest
    @DisplayName("Should reject registration with invalid payloads and return RFC 7807 ProblemDetail")
    @CsvSource({
            "invalid-email, valid_user, Valid Alias, password123, USER", // Bad email
            "test@test.com, us, Valid Alias, password123, USER",         // Username too short (min 3)
            "test2@test.com, valid_user, '', password123, USER",         // Empty alias
            "test3@test.com, valid_user, Valid Alias, 123, USER",         // Password too short (min 6)
            "test3@test.com, valid_user, Valid Alias, password123, ADMIN", // Invalid role
    })
    void shouldRejectInvalidRegistrationPayloads(String email, String username, String alias, String password, String role) throws Exception {
        String invalidPayload = String.format("""
                {
                    "email": "%s",
                    "username": "%s",
                    "alias": "%s",
                    "password": "%s",
                    "role": "%s"
                }
                """, email, username, alias, password, role);

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.type").value("urn:indiestream:error:payload-validation-failure"))
                .andExpect(jsonPath("$.title").value("Malformed Payload"));
    }
}