package com.indiestream.auth;

import com.indiestream.IntegrationTestBase;
import com.indiestream.auth.dto.UpdateUserProfileRequestDto;
import com.indiestream.auth.service.UserService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class UserIntegrationTest extends IntegrationTestBase {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserService userService;

    @Test
    @DisplayName("Autocomplete: Should return empty list for blank queries without hitting DB")
    void shouldReturnEmptyListForBlankAutocomplete() throws Exception {
        mockMvc.perform(get("/api/v1/users/autocomplete?q=   ")
                        .with(user(UUID.randomUUID().toString())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    @DisplayName("Autocomplete: Should execute search for valid queries")
    void shouldExecuteAutocompleteSearch() throws Exception {
        when(userService.searchUsersAutocomplete("john")).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/users/autocomplete?q=john")
                .with(user(UUID.randomUUID().toString())))
                .andExpect(status().isOk());

        verify(userService).searchUsersAutocomplete(eq("john"));
    }

    @Test
    @DisplayName("Profile Update: Should parse DTO and delegate to service")
    void shouldUpdateUserProfile() throws Exception {
        UUID userId = UUID.randomUUID();
        String jsonPayload = """
                {
                    "bio": "New bio description",
                    "isPrivate": true,
                    "hideSubscriptions": false
                }
                """;

        mockMvc.perform(put("/api/v1/users/me/profile")
                        .with(user(userId.toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk());

        verify(userService).updateProfile(eq(userId), any(UpdateUserProfileRequestDto.class));
    }
}