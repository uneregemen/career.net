package net.career.jobservice.controller;

import lombok.RequiredArgsConstructor;
import net.career.jobservice.dto.ApplicationResponse;
import net.career.jobservice.dto.StatusUpdateRequest;
import net.career.jobservice.service.ApplicationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/jobs")
@RequiredArgsConstructor
public class ApplicationController {

    private final ApplicationService applicationService;

    @PostMapping("/{id}/apply")
    public ResponseEntity<ApplicationResponse> apply(
            @PathVariable UUID id,
            Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(applicationService.apply(id, auth.getName()));
    }

    @GetMapping("/my-applications")
    public ResponseEntity<List<ApplicationResponse>> myApplications(Authentication auth) {
        return ResponseEntity.ok(applicationService.getMyApplications(auth.getName()));
    }

    @GetMapping("/my-job-applications")
    public ResponseEntity<List<ApplicationResponse>> myJobApplications(Authentication auth) {
        return ResponseEntity.ok(applicationService.getApplicationsForMyJobs(auth.getName()));
    }

    @PutMapping("/applications/{id}/status")
    public ResponseEntity<ApplicationResponse> updateStatus(
            @PathVariable UUID id,
            @RequestBody StatusUpdateRequest request,
            Authentication auth) {
        return ResponseEntity.ok(applicationService.updateStatus(id, request.getStatus(), auth.getName()));
    }
}
