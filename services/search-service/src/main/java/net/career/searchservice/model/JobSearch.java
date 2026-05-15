package net.career.searchservice.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "job_searches")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class JobSearch {

    @Id
    private String id;

    private String userId;       // Cognito sub, null if anonymous
    private String sessionId;    // browser session id for anonymous users

    private String position;
    private String city;

    private SearchFilters filters;

    private int resultsCount;
    private LocalDateTime createdAt;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class SearchFilters {
        private String country;
        private String town;
        private String workingPreference;
    }
}
