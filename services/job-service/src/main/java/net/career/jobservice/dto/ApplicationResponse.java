package net.career.jobservice.dto;

import lombok.*;
import net.career.jobservice.model.ApplicantUser;
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
    private String applicantName;
    private String applicantEmail;

    public static ApplicationResponse from(Application app) {
        return from(app, null);
    }

    public static ApplicationResponse from(Application app, ApplicantUser user) {
        String name = null;
        if (user != null && user.getName() != null) {
            name = (user.getName() + (user.getSurname() != null ? " " + user.getSurname() : "")).trim();
        }
        return ApplicationResponse.builder()
                .id(app.getId())
                .jobId(app.getJob().getId())
                .jobTitle(app.getJob().getTitle())
                .userId(app.getUserId())
                .appliedAt(app.getAppliedAt())
                .status(app.getStatus())
                .applicantName(name)
                .applicantEmail(user != null ? user.getEmail() : null)
                .build();
    }
}
