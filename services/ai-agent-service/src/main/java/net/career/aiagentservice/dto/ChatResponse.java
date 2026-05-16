package net.career.aiagentservice.dto;

import lombok.*;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ChatResponse {
    private String sessionId;
    private String text;              // Gemini'nin kullanıcıya yazdığı cevap
    private List<JobCard> jobCards;   // eğer iş ilanı bulduysa, kartlar olarak döner

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class JobCard {
        private String id;
        private String title;
        private String company;
        private String city;
        private String workingPreference;
        private String requirements;
    }
}
