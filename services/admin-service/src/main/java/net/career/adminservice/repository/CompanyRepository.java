package net.career.adminservice.repository;

import net.career.adminservice.model.Company;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CompanyRepository extends JpaRepository<Company, UUID> {

    // Spring generates: SELECT * FROM companies WHERE cognito_user_id = ?
    Optional<Company> findByCognitoUserId(String cognitoUserId);

    boolean existsByCognitoUserId(String cognitoUserId);
}
