package net.career.searchservice.repository;

import net.career.searchservice.model.JobSearch;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface JobSearchRepository extends MongoRepository<JobSearch, String> {

    List<JobSearch> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);

    List<JobSearch> findBySessionIdOrderByCreatedAtDesc(String sessionId, Pageable pageable);

    // Used by notification-service's related-jobs task (called via internal REST)
    List<JobSearch> findByUserIdAndCreatedAtAfter(String userId, LocalDateTime after);
}
