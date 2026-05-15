package net.career.jobservice.model;

import jakarta.persistence.*;
import lombok.*;
import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "jobs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Job implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    private String country;
    private String city;
    private String town;

    @Column(name = "working_preference")
    @Enumerated(EnumType.STRING)
    private WorkingPreference workingPreference;

    @Column(columnDefinition = "TEXT")
    private String requirements;

    @Column(name = "salary_range")
    private String salaryRange;

    @Column(name = "posted_at")
    private LocalDateTime postedAt;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "is_active")
    private boolean active;

    @PrePersist
    void prePersist() {
        postedAt = LocalDateTime.now();
        active = true;
    }

    public enum WorkingPreference {
        FULLTIME, PARTTIME, REMOTE, HYBRID
    }
}
