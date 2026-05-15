package net.career.jobservice.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import net.career.jobservice.model.Job;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class JobRequest {

    @NotBlank
    private String title;

    private String description;

    @NotBlank
    private String country;

    @NotBlank
    private String city;

    private String town;

    private Job.WorkingPreference workingPreference;

    private String requirements;

    private String salaryRange;

    private LocalDateTime expiresAt;
}
