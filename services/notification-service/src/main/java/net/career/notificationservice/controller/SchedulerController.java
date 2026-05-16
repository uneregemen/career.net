package net.career.notificationservice.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.career.notificationservice.event.JobCreatedEvent;
import net.career.notificationservice.model.JobAlert;
import net.career.notificationservice.repository.JobAlertRepository;
import net.career.notificationservice.repository.NotificationRepository;
import net.career.notificationservice.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/v1/scheduler")
@RequiredArgsConstructor
public class SchedulerController {

    private final NotificationService notificationService;
    private final JobAlertRepository alertRepository;

    // @Scheduled: yerel geliştirmede her 5 dakikada bir çalışır
    // Production'da EventBridge bu endpoint'i POST ile çağırır
    @Scheduled(fixedDelayString = "300000")  // 5 dakika = 300.000 ms
    @PostMapping("/process-job-alerts")
    public ResponseEntity<String> processJobAlerts() {
        log.info("process-job-alerts scheduler çalıştı");
        // Bu görev RabbitMQ consumer ile aynı işi yapar ama kuyruğun kaçırdığı ilanları yakalar
        // Gerçek projede son X dakikadaki yeni ilanları DB'den çeker ve eşleştirir
        // Burada mevcut tüm aktif alarmları logluyoruz (tam implementasyon iş ilanı servisi sorgusu gerektirir)
        List<JobAlert> activeAlerts = alertRepository.findByActiveTrue();
        log.info("Aktif alarm sayısı: {}", activeAlerts.size());
        return ResponseEntity.ok("process-job-alerts tamamlandı");
    }

    // Her gece çalışır: MongoDB arama geçmişine bakarak ilgili ilanları bildirir
    @Scheduled(cron = "0 0 9 * * *")  // Her gün saat 09:00'da
    @PostMapping("/process-related-jobs")
    public ResponseEntity<String> processRelatedJobs() {
        log.info("process-related-jobs scheduler çalıştı");
        // Boş liste — gerçek projede job-service'ten son 24 saatteki ilanlar çekilir
        notificationService.processRelatedJobs(List.of());
        return ResponseEntity.ok("process-related-jobs tamamlandı");
    }
}
