package net.career.adminservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import net.career.adminservice.dto.CompanyRegistrationRequest;
import net.career.adminservice.dto.CompanyResponse;
import net.career.adminservice.service.AdminService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    // POST /api/v1/admin/companies/register
    // Any logged-in user can call this to register their company
    @PostMapping("/companies/register")
    public ResponseEntity<CompanyResponse> register(
            @Valid @RequestBody CompanyRegistrationRequest request,
            Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(adminService.register(request, auth.getName()));
    }

    // GET /api/v1/admin/companies
    // Only admins can see all companies
    @GetMapping("/companies")
    public ResponseEntity<List<CompanyResponse>> listAll(Authentication auth) {
        return ResponseEntity.ok(adminService.listAll(auth.getName()));
    }

    // PUT /api/v1/admin/companies/{id}/verify
    // Admin approves a company
    @PutMapping("/companies/{id}/verify")
    public ResponseEntity<CompanyResponse> verify(
            @PathVariable UUID id,
            Authentication auth) {
        return ResponseEntity.ok(adminService.verify(id, auth.getName()));
    }

    // POST /api/v1/admin/jobs
    // Verified company posts a job (delegated to job-service)
    @PostMapping("/jobs")
    public ResponseEntity<Map> postJob(
            @RequestBody Map<String, Object> jobRequest,
            Authentication auth,
            @RequestHeader("Authorization") String bearerToken) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(adminService.postJob(jobRequest, auth.getName(), bearerToken));
    }
}
