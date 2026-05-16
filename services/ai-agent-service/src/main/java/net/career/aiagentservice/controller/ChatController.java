package net.career.aiagentservice.controller;

import lombok.RequiredArgsConstructor;
import net.career.aiagentservice.dto.ChatRequest;
import net.career.aiagentservice.dto.ChatResponse;
import net.career.aiagentservice.model.ChatSession;
import net.career.aiagentservice.service.ChatService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    // Kullanıcı mesaj gönderir → AI cevap verir
    // auth null olabilir çünkü anonim kullanıcılara da izin verdik
    @PostMapping("/chat")
    public ResponseEntity<ChatResponse> chat(
            @RequestBody ChatRequest request,
            Authentication auth) {
        String userId = (auth != null && auth.isAuthenticated()) ? auth.getName() : null;
        return ResponseEntity.ok(chatService.chat(request, userId));
    }

    // Sohbet geçmişini getir
    @GetMapping("/chat/{sessionId}")
    public ResponseEntity<ChatSession> history(@PathVariable String sessionId) {
        return ResponseEntity.ok(chatService.getHistory(sessionId));
    }
}
