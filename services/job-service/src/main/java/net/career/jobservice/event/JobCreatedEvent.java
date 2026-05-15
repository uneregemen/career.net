package net.career.jobservice.event;

import lombok.*;
import net.career.jobservice.model.Job;
import java.io.Serializable;
import java.util.UUID;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class JobCreatedEvent implements Serializable {
    private UUID jobId;
    private String title;
    private String city;
    private String country;
    private Job.WorkingPreference workingPreference;
}
