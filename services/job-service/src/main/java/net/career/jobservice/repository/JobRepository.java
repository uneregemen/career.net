package net.career.jobservice.repository;

import net.career.jobservice.model.Job;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface JobRepository extends JpaRepository<Job, UUID> {

    Page<Job> findByActiveTrueAndCityIgnoreCase(String city, Pageable pageable);

    @Query("""
        SELECT j FROM Job j
        WHERE j.active = true
        AND (:position IS NULL OR LOWER(j.title) LIKE LOWER(CONCAT('%', :position, '%')))
        AND (:city     IS NULL OR LOWER(j.city)  LIKE LOWER(CONCAT('%', :city, '%')))
        AND (:country  IS NULL OR LOWER(j.country) LIKE LOWER(CONCAT('%', :country, '%')))
        AND (:town     IS NULL OR LOWER(j.town) LIKE LOWER(CONCAT('%', :town, '%')))
        AND (:workingPreference IS NULL OR j.workingPreference = :workingPreference)
        """)
    Page<Job> search(
            @Param("position") String position,
            @Param("city") String city,
            @Param("country") String country,
            @Param("town") String town,
            @Param("workingPreference") Job.WorkingPreference workingPreference,
            Pageable pageable);

    @Query("SELECT DISTINCT j.title FROM Job j WHERE j.active = true AND LOWER(j.title) LIKE LOWER(CONCAT('%', :q, '%')) ORDER BY j.title")
    List<String> autocompletePosition(@Param("q") String q, Pageable pageable);

    @Query("SELECT DISTINCT j.city FROM Job j WHERE j.active = true AND LOWER(j.city) LIKE LOWER(CONCAT('%', :q, '%')) ORDER BY j.city")
    List<String> autocompleteCity(@Param("q") String q, Pageable pageable);

    List<Job> findTop5ByActiveTrueAndCityIgnoreCaseOrderByPostedAtDesc(String city);

    Page<Job> findByActiveTrue(Pageable pageable);
}
