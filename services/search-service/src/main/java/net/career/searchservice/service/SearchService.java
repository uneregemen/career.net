package net.career.searchservice.service;

import lombok.RequiredArgsConstructor;
import net.career.searchservice.dto.SearchRequest;
import net.career.searchservice.model.JobSearch;
import net.career.searchservice.repository.JobSearchRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class SearchService {

    private final JobSearchRepository searchRepository;
    private final WebClient jobServiceClient;

    public Map<String, Object> search(SearchRequest request, Authentication auth) {
        // Call Job Service for actual results
        String uri = buildJobSearchUri(request);
        Map<String, Object> results = jobServiceClient.get()
                .uri(uri)
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

    private String buildJobSearchUri(SearchRequest req) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromPath("/api/v1/jobs/search")
                .queryParam("page", req.getPage())
                .queryParam("size", req.getSize());

        if (req.getPosition() != null)        builder.queryParam("position", req.getPosition());
        if (req.getCity() != null)             builder.queryParam("city", normalize(req.getCity()));
        if (req.getCountry() != null)          builder.queryParam("country", req.getCountry());
        if (req.getTown() != null)             builder.queryParam("town", req.getTown());
        if (req.getWorkingPreference() != null) builder.queryParam("workingPreference", req.getWorkingPreference());

        return builder.toUriString();
    }

    // İ→I, ı→i normalize — encoding sorunlarını önler
    private String normalize(String s) {
        return s.replace("İ", "I").replace("ı", "i").toLowerCase(java.util.Locale.ENGLISH);
    }
}
