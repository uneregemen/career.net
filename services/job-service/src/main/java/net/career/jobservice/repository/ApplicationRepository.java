package net.career.jobservice.repository;

import net.career.jobservice.model.Application;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ApplicationRepository extends JpaRepository<Application, UUID> {
    List<Application> findByUserId(String userId);
    boolean existsByJobIdAndUserId(UUID jobId, String userId);

    @Query("SELECT a FROM Application a JOIN FETCH a.job j JOIN FETCH j.company c WHERE c.cognitoUserId = :ownerUserId ORDER BY a.appliedAt DESC")
    List<Application> findByJobOwnerCognitoUserId(@Param("ownerUserId") String ownerUserId);
}
