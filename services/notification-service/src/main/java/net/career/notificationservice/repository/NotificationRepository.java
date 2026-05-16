package net.career.notificationservice.repository;

import net.career.notificationservice.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    // Kullanıcının okunmamış bildirimleri — frontend'de zil ikonunun üstündeki sayı bundan gelir
    List<Notification> findByUserIdAndReadFalseOrderByCreatedAtDesc(String userId);

    // Aynı iş ilanı için aynı kullanıcıya tekrar bildirim göndermeyi önler
    boolean existsByUserIdAndJobId(String userId, UUID jobId);
}
