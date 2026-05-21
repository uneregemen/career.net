package net.career.jobservice.service;

import lombok.RequiredArgsConstructor;
import net.career.jobservice.dto.ApplicationResponse;
import net.career.jobservice.model.Application;
import net.career.jobservice.model.ApplicantUser;
import net.career.jobservice.model.Job;
import net.career.jobservice.repository.ApplicantUserRepository;
import net.career.jobservice.repository.ApplicationRepository;
import net.career.jobservice.repository.JobRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ApplicationService {

    private final ApplicationRepository applicationRepository;
    private final ApplicantUserRepository applicantUserRepository;
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

    @Transactional(readOnly = true)
    public List<ApplicationResponse> getMyApplications(String userId) {
        return applicationRepository.findByUserId(userId)
                .stream().map(ApplicationResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<ApplicationResponse> getApplicationsForMyJobs(String cognitoUserId) {
        List<Application> apps = applicationRepository.findByJobOwnerCognitoUserId(cognitoUserId);

        Set<String> userIds = apps.stream().map(Application::getUserId).collect(Collectors.toSet());
        Map<String, ApplicantUser> userMap = applicantUserRepository
                .findByCognitoUserIdIn(userIds).stream()
                .collect(Collectors.toMap(ApplicantUser::getCognitoUserId, u -> u));

        return apps.stream()
                .map(a -> ApplicationResponse.from(a, userMap.get(a.getUserId())))
                .toList();
    }

    @Transactional
    public ApplicationResponse updateStatus(UUID applicationId, String status, String cognitoUserId) {
        if (!List.of("ACCEPTED", "REJECTED", "PENDING").contains(status)) {
            throw new RuntimeException("Invalid status: " + status);
        }

        Application app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new RuntimeException("Application not found: " + applicationId));

        if (!app.getJob().getCompany().getCognitoUserId().equals(cognitoUserId)) {
            throw new RuntimeException("Not authorized to update this application");
        }

        app.setStatus(status);
        return ApplicationResponse.from(applicationRepository.save(app));
    }
}
