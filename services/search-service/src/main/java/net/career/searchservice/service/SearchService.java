package net.career.searchservice.service;

import lombok.RequiredArgsConstructor;
import net.career.searchservice.dto.SearchRequest;
import net.career.searchservice.model.JobSearch;
import net.career.searchservice.repository.JobSearchRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class SearchService {

    private final JobSearchRepository searchRepository;
    private final WebClient jobServiceClient;

    public Map<String, Object> search(SearchRequest request, Authentication auth) {
        Map<String, Object> results = jobServiceClient.get()
                .uri(uriBuilder -> {
                    uriBuilder.path("/api/v1/jobs/search")
                            .queryParam("page", request.getPage())
                            .queryParam("size", request.getSize());
                    if (request.getPosition() != null && !request.getPosition().isBlank())
                        uriBuilder.queryParam("position", request.getPosition());
                    if (request.getCity() != null && !request.getCity().isBlank())
                        uriBuilder.queryParam("city", normalize(request.getCity()));
                    if (request.getCountry() != null && !request.getCountry().isBlank())
                        uriBuilder.queryParam("country", request.getCountry());
                    if (request.getTown() != null && !request.getTown().isBlank())
                        uriBuilder.queryParam("town", request.getTown());
                    if (request.getWorkingPreference() != null && !request.getWorkingPreference().isBlank())
                        uriBuilder.queryParam("workingPreference", request.getWorkingPreference());
                    return uriBuilder.build();
                })
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        int totalElements = results != null && results.containsKey("totalElements")
                ? (int) results.get("totalElements") : 0;

        // Persist search in MongoDB
        String userId = (auth != null && auth.isAuthenticated()) ? auth.getName() : null;
        JobSearch jobSearch = JobSearch.builder()
                .userId(userId)
                .sessionId(request.getSessionId())
                .position(request.getPosition())
                .city(request.getCity())
                .filters(JobSearch.SearchFilters.builder()
                        .country(request.getCountry())
                        .town(request.getTown())
                        .workingPreference(request.getWorkingPreference())
                        .build())
                .resultsCount(totalElements)
                .createdAt(LocalDateTime.now())
                .build();
        searchRepository.save(jobSearch);

        return results;
    }

    public List<JobSearch> getRecentSearches(String userId, String sessionId) {
        PageRequest pageable = PageRequest.of(0, 10);
        if (userId != null) {
            return searchRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
        }
        return searchRepository.findBySessionIdOrderByCreatedAtDesc(sessionId, pageable);
    }

    // Used by notification-service to fetch a user's recent search terms
    public List<JobSearch> getSearchesSince(String userId, LocalDateTime since) {
        return searchRepository.findByUserIdAndCreatedAtAfter(userId, since);
    }

    // İ→I, ı→i normalize — encoding sorunlarını önler
    private String normalize(String s) {
        return s.replace("İ", "I").replace("ı", "i").toLowerCase(java.util.Locale.ENGLISH);
    }
}
