package net.career.notificationservice.repository;

import net.career.notificationservice.model.JobAlert;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface JobAlertRepository extends JpaRepository<JobAlert, UUID> {

    // Kullanıcının tüm aktif alarmları
    List<JobAlert> findByUserIdAndActiveTrue(String userId);

    // Scheduler'ın yeni ilanları eşleştirmek için tüm aktif alarmları çekmesi
    List<JobAlert> findByActiveTrue();
}
