package net.career.notificationservice.dto;

import lombok.*;
import java.util.UUID;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class JobSummary {
    private UUID id;
    private String title;
    private String city;
    private String country;
    private String workingPreference;
}
