package net.career.notificationservice.controller;

import lombok.RequiredArgsConstructor;
import net.career.notificationservice.model.UserProfile;
import net.career.notificationservice.repository.UserProfileRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final UserProfileRepository userProfileRepository;

    @GetMapping
    public ResponseEntity<UserProfile> getProfile(Authentication auth) {
        String cognitoId = auth.getName();
        UserProfile profile = userProfileRepository.findByCognitoUserId(cognitoId)
                .orElse(UserProfile.builder().cognitoUserId(cognitoId).build());
        return ResponseEntity.ok(profile);
    }

    @PutMapping
    @Transactional
    public ResponseEntity<UserProfile> updateProfile(
            @RequestBody Map<String, Object> body,
            Authentication auth) {
        String cognitoId = auth.getName();
        UserProfile profile = userProfileRepository.findByCognitoUserId(cognitoId)
                .orElse(UserProfile.builder().cognitoUserId(cognitoId).build());

        if (body.containsKey("name"))       profile.setName((String) body.get("name"));
        if (body.containsKey("surname"))    profile.setSurname((String) body.get("surname"));
        if (body.containsKey("email"))      profile.setEmail((String) body.get("email"));
        if (body.containsKey("phone"))      profile.setPhone((String) body.get("phone"));
        if (body.containsKey("gender"))     profile.setGender((String) body.get("gender"));
        if (body.containsKey("profession")) profile.setProfession((String) body.get("profession"));
        if (body.containsKey("age") && body.get("age") != null)
            profile.setAge(Integer.valueOf(body.get("age").toString()));

        return ResponseEntity.ok(userProfileRepository.save(profile));
    }
}
