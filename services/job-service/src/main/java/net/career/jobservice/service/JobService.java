package net.career.jobservice.service;

import lombok.RequiredArgsConstructor;
import net.career.jobservice.dto.JobRequest;
import net.career.jobservice.dto.JobResponse;
import net.career.jobservice.event.JobCreatedEvent;
import net.career.jobservice.model.Company;
import net.career.jobservice.model.Job;
import net.career.jobservice.repository.CompanyRepository;
import net.career.jobservice.repository.JobRepository;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class JobService {

    private final JobRepository jobRepository;
    private final CompanyRepository companyRepository;
    private final RabbitTemplate rabbitTemplate;

    @Value("${rabbitmq.queue.job-created}")
    private String jobCreatedQueue;

    @Cacheable(value = "jobs", key = "#id")
    public JobResponse getById(UUID id) {
        return jobRepository.findById(id)
                .filter(Job::isActive)
                .map(JobResponse::from)
                .orElseThrow(() -> new RuntimeException("Job not found: " + id));
    }

    public Page<JobResponse> list(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("postedAt").descending());
        return jobRepository.findByActiveTrue(pageable).map(JobResponse::from);
    }

    @Cacheable(value = "cityJobs", key = "#city")
    public List<JobResponse> getNearby(String city) {
        return jobRepository
                .findTop5ByActiveTrueAndCityIgnoreCaseOrderByPostedAtDesc(city)
                .stream().map(JobResponse::from).toList();
    }

    public Page<JobResponse> search(String position, String city, String country,
                                    String town, Job.WorkingPreference workingPreference,
                                    int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("postedAt").descending());
        return jobRepository.search(position, city, country, town, workingPreference, pageable)
                .map(JobResponse::from);
    }

    public List<String> autocompletePosition(String q) {
        return jobRepository.autocompletePosition(q, PageRequest.of(0, 10));
    }

    public List<String> autocompleteCity(String q) {
        return jobRepository.autocompleteCity(q, PageRequest.of(0, 10));
    }

    @Transactional
    @CacheEvict(value = {"cityJobs", "jobSearch"}, allEntries = true)
    public JobResponse create(JobRequest request, String cognitoUserId) {
        Company company = companyRepository.findByCognitoUserId(cognitoUserId)
                .orElseThrow(() -> new RuntimeException("Company not found for user: " + cognitoUserId));

        if (!company.isVerified() && !company.isAdmin()) {
            throw new RuntimeException("Company is not verified yet");
        }

        Job job = Job.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .company(company)
                .country(request.getCountry())
                .city(request.getCity())
                .town(request.getTown())
                .workingPreference(request.getWorkingPreference())
                .requirements(request.getRequirements())
                .salaryRange(request.getSalaryRange())
                .expiresAt(request.getExpiresAt())
                .build();

        job = jobRepository.save(job);

        rabbitTemplate.convertAndSend(jobCreatedQueue, JobCreatedEvent.builder()
                .jobId(job.getId())
                .title(job.getTitle())
                .city(job.getCity())
                .country(job.getCountry())
                .workingPreference(job.getWorkingPreference())
                .build());

        return JobResponse.from(job);
    }

    @Transactional
    @CacheEvict(value = "jobs", key = "#id")
    public JobResponse update(UUID id, JobRequest request, String cognitoUserId) {
        Job job = jobRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Job not found: " + id));

        Company company = companyRepository.findByCognitoUserId(cognitoUserId)
                .orElseThrow(() -> new RuntimeException("Company not found"));

        if (!job.getCompany().getId().equals(company.getId()) && !company.isAdmin()) {
            throw new RuntimeException("Not authorized to update this job");
        }

        job.setTitle(request.getTitle());
        job.setDescription(request.getDescription());
        job.setCountry(request.getCountry());
        job.setCity(request.getCity());
        job.setTown(request.getTown());
        job.setWorkingPreference(request.getWorkingPreference());
        job.setRequirements(request.getRequirements());
        job.setSalaryRange(request.getSalaryRange());
        job.setExpiresAt(request.getExpiresAt());

        return JobResponse.from(jobRepository.save(job));
    }

    @Transactional
    @CacheEvict(value = "jobs", key = "#id")
    public void delete(UUID id, String cognitoUserId) {
        Job job = jobRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Job not found: " + id));

        Company company = companyRepository.findByCognitoUserId(cognitoUserId)
                .orElseThrow(() -> new RuntimeException("Company not found"));

        if (!company.isAdmin()) {
            throw new RuntimeException("Only admins can delete jobs");
        }

        job.setActive(false);
        jobRepository.save(job);
    }
}
