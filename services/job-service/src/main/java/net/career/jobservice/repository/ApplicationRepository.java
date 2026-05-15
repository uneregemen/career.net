package net.career.jobservice.repository;

import net.career.jobservice.model.Application;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ApplicationRepository extends JpaRepository<Application, UUID> {
    List<Application> findByUserId(String userId);
    boolean existsByJobIdAndUserId(UUID jobId, String userId);
}
