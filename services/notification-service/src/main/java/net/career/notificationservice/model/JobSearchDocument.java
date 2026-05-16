package net.career.notificationservice.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

// Bu sınıf sadece MongoDB'yi okumak için var — search-service'in yazdığı belgeyi okuruz
@Document(collection = "job_searches")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class JobSearchDocument {

    @Id
    private String id;
    private String userId;
    private String position;
    private String city;
    private LocalDateTime createdAt;
}
