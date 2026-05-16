package net.career.notificationservice.controller;

import lombok.RequiredArgsConstructor;
import net.career.notificationservice.model.JobAlert;
import net.career.notificationservice.service.AlertService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/alerts")
@RequiredArgsConstructor
public class AlertController {

    private final AlertService alertService;

    @PostMapping
    public ResponseEntity<JobAlert> create(
            @RequestBody Map<String, String> body,
            Authentication auth) {
        JobAlert alert = alertService.create(
                auth.getName(),
                body.get("positionKeywords"),
                body.get("city"),
                body.get("workingPreference"));
        return ResponseEntity.status(HttpStatus.CREATED).body(alert);
    }

    @GetMapping
    public ResponseEntity<List<JobAlert>> list(Authentication auth) {
        return ResponseEntity.ok(alertService.getMyAlerts(auth.getName()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id, Authentication auth) {
        alertService.delete(id, auth.getName());
        return ResponseEntity.noContent().build();
    }
}
