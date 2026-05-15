package net.career.jobservice.dto;

import lombok.*;
import net.career.jobservice.model.Application;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ApplicationResponse {

    private UUID id;
    private UUID jobId;
    private String jobTitle;
    private String userId;
    private LocalDateTime appliedAt;
    private String status;

    public static ApplicationResponse from(Application app) {
        return ApplicationResponse.builder()
                .id(app.getId())
                .jobId(app.getJob().getId())
                .jobTitle(app.getJob().getTitle())
                .userId(app.getUserId())
                .appliedAt(app.getAppliedAt())
                .status(app.getStatus())
                .build();
    }
}
