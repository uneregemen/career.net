package net.career.notificationservice.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.career.notificationservice.event.JobCreatedEvent;
import net.career.notificationservice.model.JobAlert;
import net.career.notificationservice.repository.JobAlertRepository;
import net.career.notificationservice.service.NotificationService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/scheduler")
@RequiredArgsConstructor
public class SchedulerController {

    private final NotificationService notificationService;
    private final JobAlertRepository alertRepository;
    private final RestTemplate restTemplate;

    @Value("${services.job-service-url}")
    private String jobServiceUrl;

    // @Scheduled: yerel geliştirmede her 5 dakikada bir çalışır
    // Production'da EventBridge bu endpoint'i POST ile çağırır
    @Scheduled(fixedDelayString = "300000")  // 5 dakika = 300.000 ms
    @PostMapping("/process-job-alerts")
    public ResponseEntity<String> processJobAlerts() {
        log.info("process-job-alerts scheduler çalıştı");
        List<JobAlert> activeAlerts = alertRepository.findByActiveTrue();
        log.info("Aktif alarm sayısı: {}", activeAlerts.size());
        return ResponseEntity.ok("process-job-alerts tamamlandı");
    }

    // Her gün saat 09:00'da çalışır: MongoDB arama geçmişine bakarak ilgili ilanları bildirir
    @Scheduled(cron = "0 0 9 * * *")
    @PostMapping("/process-related-jobs")
    public ResponseEntity<String> processRelatedJobs() {
        log.info("process-related-jobs scheduler çalıştı");

        List<JobCreatedEvent> recentJobs = fetchRecentJobsFromJobService();
        log.info("Job service'ten {} ilan çekildi", recentJobs.size());

        notificationService.processRelatedJobs(recentJobs);
        return ResponseEntity.ok("process-related-jobs tamamlandı");
    }

    private List<JobCreatedEvent> fetchRecentJobsFromJobService() {
        try {
            String url = jobServiceUrl + "/api/v1/jobs?page=0&size=100";
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    url, HttpMethod.GET, null,
                    new ParameterizedTypeReference<>() {}
            );

            if (response.getBody() == null) return List.of();

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> content = (List<Map<String, Object>>) response.getBody().get("content");
            if (content == null) return List.of();

            return content.stream()
                    .map(j -> JobCreatedEvent.builder()
                            .jobId(j.get("id") != null ? java.util.UUID.fromString((String) j.get("id")) : null)
                            .title((String) j.get("title"))
                            .city((String) j.get("city"))
                            .country((String) j.get("country"))
                            .workingPreference((String) j.get("workingPreference"))
                            .build())
                    .toList();
        } catch (Exception e) {
            log.error("Job service'ten ilanlar çekilemedi: {}", e.getMessage());
            return List.of();
        }
    }
}
