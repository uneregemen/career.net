package net.career.notificationservice.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "job_alerts")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class JobAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // Cognito user ID — kimin alarmı olduğunu tutar
    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "position_keywords")
    private String positionKeywords;

    private String city;

    @Column(name = "working_preference")
    private String workingPreference;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "is_active")
    private boolean active;

    @PrePersist
    void prePersist() {
        createdAt = LocalDateTime.now();
        active = true;
    }
}
