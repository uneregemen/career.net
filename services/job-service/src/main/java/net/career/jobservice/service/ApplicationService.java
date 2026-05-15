package net.career.jobservice.service;

import lombok.RequiredArgsConstructor;
import net.career.jobservice.dto.ApplicationResponse;
import net.career.jobservice.model.Application;
import net.career.jobservice.model.Job;
import net.career.jobservice.repository.ApplicationRepository;
import net.career.jobservice.repository.JobRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ApplicationService {

    private final ApplicationRepository applicationRepository;
    private final JobRepository jobRepository;

    @Transactional
    public ApplicationResponse apply(UUID jobId, String userId) {
        Job job = jobRepository.findById(jobId)
                .filter(Job::isActive)
                .orElseThrow(() -> new RuntimeException("Job not found: " + jobId));

        if (applicationRepository.existsByJobIdAndUserId(jobId, userId)) {
            throw new RuntimeException("Already applied to this job");
        }

        Application application = Application.builder()
                .job(job)
                .userId(userId)
                .build();

        return ApplicationResponse.from(applicationRepository.save(application));
    }

    public List<ApplicationResponse> getMyApplications(String userId) {
        return applicationRepository.findByUserId(userId)
                .stream().map(ApplicationResponse::from).toList();
    }
}
