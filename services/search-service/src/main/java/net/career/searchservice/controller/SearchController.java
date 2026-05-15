package net.career.searchservice.controller;

import lombok.RequiredArgsConstructor;
import net.career.searchservice.dto.SearchRequest;
import net.career.searchservice.model.JobSearch;
import net.career.searchservice.service.SearchService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/search")
@RequiredArgsConstructor
public class SearchController {

    private final SearchService searchService;

    @PostMapping
    public ResponseEntity<Map<String, Object>> search(
            @RequestBody SearchRequest request,
            Authentication auth) {
        return ResponseEntity.ok(searchService.search(request, auth));
    }

    @GetMapping("/recent")
    public ResponseEntity<List<JobSearch>> recent(
            Authentication auth,
            @RequestParam(required = false) String sessionId) {
        String userId = (auth != null && auth.isAuthenticated()) ? auth.getName() : null;
        return ResponseEntity.ok(searchService.getRecentSearches(userId, sessionId));
    }

    // Internal endpoint: called by notification-service to get a user's recent searches
    @GetMapping("/history/{userId}")
    public ResponseEntity<List<JobSearch>> history(
            @PathVariable String userId,
            @RequestParam(required = false) String daysSince) {
        int days = daysSince != null ? Integer.parseInt(daysSince) : 7;
        java.time.LocalDateTime since = java.time.LocalDateTime.now().minusDays(days);
        return ResponseEntity.ok(searchService.getSearchesSince(userId, since));
    }
}
