package net.career.notificationservice.repository;

import net.career.notificationservice.model.UserProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserProfileRepository extends JpaRepository<UserProfile, UUID> {
    Optional<UserProfile> findByCognitoUserId(String cognitoUserId);
}
