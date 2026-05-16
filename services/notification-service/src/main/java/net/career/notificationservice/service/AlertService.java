package net.career.notificationservice.service;

import lombok.RequiredArgsConstructor;
import net.career.notificationservice.model.JobAlert;
import net.career.notificationservice.repository.JobAlertRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AlertService {

    private final JobAlertRepository alertRepository;

    public JobAlert create(String userId, String positionKeywords, String city, String workingPreference) {
        return alertRepository.save(JobAlert.builder()
                .userId(userId)
                .positionKeywords(positionKeywords)
                .city(city)
                .workingPreference(workingPreference)
                .build());
    }

    public List<JobAlert> getMyAlerts(String userId) {
        return alertRepository.findByUserIdAndActiveTrue(userId);
    }

    @Transactional
    public void delete(UUID alertId, String userId) {
        alertRepository.findById(alertId).ifPresent(alert -> {
            if (alert.getUserId().equals(userId)) {
                alert.setActive(false);
                alertRepository.save(alert);
            }
        });
    }
}
