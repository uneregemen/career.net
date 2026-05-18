package net.career.jobservice.service;

import jakarta.persistence.criteria.Predicate;
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
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
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

    @Cacheable(value = "cityJobs", key = "T(net.career.jobservice.service.JobService).normalizeCity(#city)")
    public List<JobResponse> getNearby(String city) {
        return jobRepository
                .findNearbyByNormalizedCity(normalizeCity(city))
                .stream().map(JobResponse::from).toList();
    }

    // İ→I, ı→i normalize ederek Türkçe büyük/küçük harf sorununu çözer
    public static String normalizeCity(String city) {
        return city.replace("İ", "I").replace("ı", "i").toLowerCase(Locale.ENGLISH);
    }

    public Page<JobResponse> search(String position, String city, String country,
                                    String town, Job.WorkingPreference workingPreference,
                                    int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("postedAt").descending());

        // Specification: sadece null olmayan parametreler WHERE koşuluna eklenir
        // Böylece PostgreSQL'e hiçbir zaman null değerli LOWER() gönderilmez
        Specification<Job> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isTrue(root.get("active")));

            if (position != null && !position.isBlank())
                predicates.add(cb.like(cb.lower(root.get("title")), "%" + position.toLowerCase(Locale.ROOT) + "%"));
            if (city != null && !city.isBlank()) {
                // DB tarafında İ→I, ı→i normalize et; input tarafında da aynı dönüşüm yapıldı
                jakarta.persistence.criteria.Expression<String> normalizedDbCity = cb.lower(
                    cb.function("REPLACE", String.class,
                        cb.function("REPLACE", String.class, root.get("city"),
                            cb.literal("İ"), cb.literal("I")),
                        cb.literal("ı"), cb.literal("i"))
                );
                predicates.add(cb.like(normalizedDbCity, "%" + normalizeCity(city) + "%"));
            }
            if (country != null && !country.isBlank())
                predicates.add(cb.like(cb.lower(root.get("country")), "%" + country.toLowerCase(Locale.ROOT) + "%"));
            if (town != null && !town.isBlank())
                predicates.add(cb.like(cb.lower(root.get("town")), "%" + town.toLowerCase(Locale.ROOT) + "%"));
            if (workingPreference != null)
                predicates.add(cb.equal(root.get("workingPreference"), workingPreference));

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return jobRepository.findAll(spec, pageable).map(JobResponse::from);
    }

    public List<String> autocompletePosition(String q) {
        return jobRepository.autocompletePosition(q.toLowerCase(Locale.ROOT), PageRequest.of(0, 10));
    }

    public List<String> autocompleteCity(String q) {
        return jobRepository.autocompleteCity(normalizeCity(q));
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
