package net.career.notificationservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.career.notificationservice.event.JobCreatedEvent;
import net.career.notificationservice.model.JobAlert;
import net.career.notificationservice.model.JobSearchDocument;
import net.career.notificationservice.model.Notification;
import net.career.notificationservice.repository.JobAlertRepository;
import net.career.notificationservice.repository.JobSearchDocumentRepository;
import net.career.notificationservice.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j  // log.info() gibi loglama metodlarını açar
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final JobAlertRepository alertRepository;
    private final NotificationRepository notificationRepository;
    private final JobSearchDocumentRepository searchRepository;

    @Value("${scheduler.related-jobs-lookback-days}")
    private int lookbackDays;

    // RabbitMQ consumer tarafından çağrılır: yeni ilan → alarm eşleştir → bildirim oluştur
    @Transactional
    public void matchAndNotify(JobCreatedEvent event) {
        List<JobAlert> activeAlerts = alertRepository.findByActiveTrue();

        for (JobAlert alert : activeAlerts) {
            if (matches(alert, event)) {
                createNotificationIfNotExists(
                        alert.getUserId(),
                        event.getJobId(),
                        "Yeni İş İlanı: " + event.getTitle(),
                        event.getTitle() + " – " + event.getCity()
                );
            }
        }
    }

    // Alarm kriterleri ile iş ilanının eşleşip eşleşmediğini kontrol eder
    private boolean matches(JobAlert alert, JobCreatedEvent event) {
        if (alert.getPositionKeywords() != null && !alert.getPositionKeywords().isBlank()) {
            boolean titleMatch = event.getTitle().toLowerCase()
                    .contains(alert.getPositionKeywords().toLowerCase());
            if (!titleMatch) return false;
        }
        if (alert.getCity() != null && !alert.getCity().isBlank()) {
            if (!alert.getCity().equalsIgnoreCase(event.getCity())) return false;
        }
        if (alert.getWorkingPreference() != null && !alert.getWorkingPreference().isBlank()) {
            if (!alert.getWorkingPreference().equalsIgnoreCase(event.getWorkingPreference())) return false;
        }
        return true;
    }

    // İlgili iş ilanı bildirimi (scheduled task tarafından çağrılır)
    // MongoDB'deki arama geçmişine bakarak kullanıcılara ilgili yeni ilanlar bildirir
    @Transactional
    public void processRelatedJobs(List<JobCreatedEvent> recentJobs) {
        LocalDateTime since = LocalDateTime.now().minusDays(lookbackDays);
        List<JobSearchDocument> recentSearches = searchRepository.findByCreatedAtAfterAndUserIdNotNull(since);

        // userId → arama termleri listesi
        Map<String, Set<String>> userSearchTerms = recentSearches.stream()
                .filter(s -> s.getPosition() != null)
                .collect(Collectors.groupingBy(
                        JobSearchDocument::getUserId,
                        Collectors.mapping(s -> s.getPosition().toLowerCase(), Collectors.toSet())
                ));

        for (JobCreatedEvent job : recentJobs) {
            for (Map.Entry<String, Set<String>> entry : userSearchTerms.entrySet()) {
                String userId = entry.getKey();
                boolean relevant = entry.getValue().stream()
                        .anyMatch(term -> job.getTitle().toLowerCase().contains(term));

                if (relevant) {
                    createNotificationIfNotExists(
                            userId,
                            job.getJobId(),
                            "Sana Uygun İlan: " + job.getTitle(),
                            job.getTitle() + " – " + job.getCity() + " (aramalarına göre)"
                    );
                }
            }
        }
    }

    private void createNotificationIfNotExists(String userId, UUID jobId, String title, String message) {
        // Aynı kullanıcıya aynı ilan için iki kez bildirim gönderme
        if (!notificationRepository.existsByUserIdAndJobId(userId, jobId)) {
            notificationRepository.save(Notification.builder()
                    .userId(userId)
                    .jobId(jobId)
                    .title(title)
                    .message(message)
                    .build());
            log.info("Bildirim oluşturuldu: userId={} jobId={}", userId, jobId);
        }
    }

    // GET /api/v1/notifications — kullanıcının okunmamış bildirimleri
    public List<Notification> getUnread(String userId) {
        return notificationRepository.findByUserIdAndReadFalseOrderByCreatedAtDesc(userId);
    }

    // PUT /api/v1/notifications/{id}/read — bildirimi okundu olarak işaretle
    @Transactional
    public void markRead(UUID notificationId, String userId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            if (n.getUserId().equals(userId)) {
                n.setRead(true);
                notificationRepository.save(n);
            }
        });
    }
}
