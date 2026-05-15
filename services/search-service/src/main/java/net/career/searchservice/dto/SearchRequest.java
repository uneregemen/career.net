package net.career.searchservice.dto;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SearchRequest {
    private String position;
    private String city;
    private String country;
    private String town;
    private String workingPreference;
    private String sessionId;
    private int page;
    private int size = 20;
}
