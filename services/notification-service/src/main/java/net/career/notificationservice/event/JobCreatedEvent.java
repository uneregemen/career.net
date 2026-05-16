package net.career.notificationservice.event;

import lombok.*;
import java.util.UUID;

// Job Service'in yayınladığı mesajla birebir aynı yapıda olmalı
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class JobCreatedEvent {
    private UUID jobId;
    private String title;
    private String city;
    private String country;
    private String workingPreference;
}
