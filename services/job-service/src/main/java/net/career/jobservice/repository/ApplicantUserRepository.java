package net.career.jobservice.repository;

import net.career.jobservice.model.ApplicantUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface ApplicantUserRepository extends JpaRepository<ApplicantUser, UUID> {
    List<ApplicantUser> findByCognitoUserIdIn(Collection<String> cognitoUserIds);
}
