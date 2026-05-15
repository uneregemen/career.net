package net.career.jobservice.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "applications")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Application {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id")
    private Job job;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "applied_at")
    private LocalDateTime appliedAt;

    private String status;

    @PrePersist
    void prePersist() {
        appliedAt = LocalDateTime.now();
        if (status == null) status = "APPLIED";
    }
}
