package net.career.jobservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import net.career.jobservice.dto.JobRequest;
import net.career.jobservice.dto.JobResponse;
import net.career.jobservice.model.Job;
import net.career.jobservice.service.JobService;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/jobs")
@RequiredArgsConstructor
public class JobController {

    private final JobService jobService;

    @GetMapping
    public ResponseEntity<Page<JobResponse>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(jobService.list(page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<JobResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(jobService.getById(id));
    }

    @GetMapping("/nearby")
    public ResponseEntity<List<JobResponse>> nearby(@RequestParam String city) {
        return ResponseEntity.ok(jobService.getNearby(city));
    }

    @GetMapping("/search")
    public ResponseEntity<Page<JobResponse>> search(
            @RequestParam(required = false) String position,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String country,
            @RequestParam(required = false) String town,
            @RequestParam(required = false) Job.WorkingPreference workingPreference,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
                jobService.search(position, city, country, town, workingPreference, page, size));
    }

    @GetMapping("/autocomplete/position")
    public ResponseEntity<List<String>> autocompletePosition(@RequestParam String q) {
        return ResponseEntity.ok(jobService.autocompletePosition(q));
    }

    @GetMapping("/autocomplete/city")
    public ResponseEntity<List<String>> autocompleteCity(@RequestParam String q) {
        return ResponseEntity.ok(jobService.autocompleteCity(q));
    }

    @PostMapping
    public ResponseEntity<JobResponse> create(
            @Valid @RequestBody JobRequest request,
            Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(jobService.create(request, auth.getName()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<JobResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody JobRequest request,
            Authentication auth) {
        return ResponseEntity.ok(jobService.update(id, request, auth.getName()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id, Authentication auth) {
        jobService.delete(id, auth.getName());
        return ResponseEntity.noContent().build();
    }
}
