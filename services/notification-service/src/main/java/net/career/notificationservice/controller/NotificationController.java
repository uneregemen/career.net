package net.career.notificationservice.controller;

import lombok.RequiredArgsConstructor;
import net.career.notificationservice.model.Notification;
import net.career.notificationservice.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    // Kullanıcının okunmamış bildirimlerini döner — frontend zil ikonu için kullanır
    @GetMapping
    public ResponseEntity<List<Notification>> getUnread(Authentication auth) {
        return ResponseEntity.ok(notificationService.getUnread(auth.getName()));
    }

    // Kullanıcı bildirime tıkladığında okundu olarak işaretler
    @PutMapping("/{id}/read")
    public ResponseEntity<Void> markRead(@PathVariable UUID id, Authentication auth) {
        notificationService.markRead(id, auth.getName());
        return ResponseEntity.noContent().build();
    }
}
