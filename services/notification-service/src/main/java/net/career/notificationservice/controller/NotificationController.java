package net.career.notificationservice.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.career.notificationservice.model.Notification;
import net.career.notificationservice.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    // Kullanıcının okunmamış bildirimlerini döner — frontend zil ikonu için kullanır
    @GetMapping
    public ResponseEntity<List<Notification>> getUnread(Authentication auth) {
        String userId = auth.getName();
        List<Notification> result = notificationService.getUnread(userId);
        log.info("GET /notifications — userId={} → {} bildirim", userId, result.size());
        return ResponseEntity.ok(result);
    }

    // Kullanıcı bildirime tıkladığında okundu olarak işaretler
    @PutMapping("/{id}/read")
    public ResponseEntity<Void> markRead(@PathVariable UUID id, Authentication auth) {
        notificationService.markRead(id, auth.getName());
        return ResponseEntity.noContent().build();
    }
}
