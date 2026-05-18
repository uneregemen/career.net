package net.career.jobservice.repository;

import net.career.jobservice.model.Job;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

// JpaSpecificationExecutor: dinamik WHERE koşulları için — null parametreler soruna yol açmaz
public interface JobRepository extends JpaRepository<Job, UUID>, JpaSpecificationExecutor<Job> {

    Page<Job> findByActiveTrueAndCityIgnoreCase(String city, Pageable pageable);

    @Query("SELECT DISTINCT j.title FROM Job j WHERE j.active = true AND LOWER(j.title) LIKE LOWER(CONCAT('%', :q, '%')) ORDER BY j.title")
    List<String> autocompletePosition(@Param("q") String q, Pageable pageable);

    // Türkçe İ/ı → I/i normalize edildikten sonra eşleştir
    @Query(value = "SELECT DISTINCT city FROM jobs WHERE is_active = true " +
                   "AND LOWER(REPLACE(REPLACE(city, 'İ', 'I'), 'ı', 'i')) LIKE '%' || :q || '%' " +
                   "ORDER BY city LIMIT 10", nativeQuery = true)
    List<String> autocompleteCity(@Param("q") String q);

    @Query(value = "SELECT * FROM jobs WHERE is_active = true " +
                   "AND LOWER(REPLACE(REPLACE(city, 'İ', 'I'), 'ı', 'i')) = :city " +
                   "ORDER BY posted_at DESC LIMIT 5", nativeQuery = true)
    List<Job> findNearbyByNormalizedCity(@Param("city") String city);

    Page<Job> findByActiveTrue(Pageable pageable);
}
