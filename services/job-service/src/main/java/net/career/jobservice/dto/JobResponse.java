package net.career.jobservice.dto;

import lombok.*;
import net.career.jobservice.model.Job;
import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class JobResponse implements Serializable {

    private UUID id;
    private String title;
    private String description;
    private String companyName;
    private UUID companyId;
    private String country;
    private String city;
    private String town;
    private Job.WorkingPreference workingPreference;
    private String requirements;
    private String salaryRange;
    private LocalDateTime postedAt;
    private LocalDateTime expiresAt;
    private boolean active;

    public static JobResponse from(Job job) {
        return JobResponse.builder()
                .id(job.getId())
                .title(job.getTitle())
                .description(job.getDescription())
                .companyName(job.getCompany() != null ? job.getCompany().getName() : null)
                .companyId(job.getCompany() != null ? job.getCompany().getId() : null)
                .country(job.getCountry())
                .city(job.getCity())
                .town(job.getTown())
                .workingPreference(job.getWorkingPreference())
                .requirements(job.getRequirements())
                .salaryRange(job.getSalaryRange())
                .postedAt(job.getPostedAt())
                .expiresAt(job.getExpiresAt())
                .active(job.isActive())
                .build();
    }
}
