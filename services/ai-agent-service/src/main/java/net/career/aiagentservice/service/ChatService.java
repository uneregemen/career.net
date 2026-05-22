package net.career.aiagentservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.career.aiagentservice.dto.ChatRequest;
import net.career.aiagentservice.dto.ChatResponse;
import net.career.aiagentservice.model.ChatSession;
import net.career.aiagentservice.repository.ChatSessionRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatSessionRepository sessionRepository;
    private final GeminiService geminiService;

    public ChatResponse chat(ChatRequest request, String userId, String bearerToken) {
        // Mevcut oturumu bul ya da yeni oluştur (MongoDB erişilemezse boş oturum kullan)
        ChatSession session;
        try {
            session = sessionRepository.findBySessionId(request.getSessionId())
                    .orElse(ChatSession.builder()
                            .sessionId(request.getSessionId())
                            .userId(userId)
                            .createdAt(LocalDateTime.now())
                            .build());
        } catch (Exception e) {
            log.warn("MongoDB oturum yüklenemedi, bellekte devam ediliyor: {}", e.getMessage());
            session = ChatSession.builder()
                    .sessionId(request.getSessionId())
                    .userId(userId)
                    .createdAt(LocalDateTime.now())
                    .build();
        }

        // Geçmiş mesajları Gemini formatına çevir
        List<Map<String, Object>> history = session.getMessages().stream()
                .map(msg -> Map.<String, Object>of(
                        "role", msg.getRole().equals("assistant") ? "model" : "user",
                        "parts", List.of(Map.of("text", msg.getContent()))
                ))
                .collect(Collectors.toList());

        // Gemini'ye gönder
        Map<String, Object> result = geminiService.chat(history, request.getMessage(), bearerToken);

        String aiText = (String) result.get("text");
        List<Map<String, Object>> rawCards = (List<Map<String, Object>>) result.get("jobCards");

        // Mesajları MongoDB'ye kaydet (erişilemezse sessizce geç)
        try {
            session.getMessages().add(ChatSession.ChatMessage.builder()
                    .role("user")
                    .content(request.getMessage())
                    .timestamp(LocalDateTime.now())
                    .build());
            session.getMessages().add(ChatSession.ChatMessage.builder()
                    .role("assistant")
                    .content(aiText)
                    .timestamp(LocalDateTime.now())
                    .build());
            session.setUpdatedAt(LocalDateTime.now());
            sessionRepository.save(session);
        } catch (Exception e) {
            log.warn("MongoDB oturum kaydedilemedi: {}", e.getMessage());
        }

        // İş kartlarını ChatResponse formatına çevir
        List<ChatResponse.JobCard> jobCards = rawCards.stream()
                .map(card -> ChatResponse.JobCard.builder()
                        .id(String.valueOf(card.getOrDefault("id", "")))
                        .title(String.valueOf(card.getOrDefault("title", "")))
                        .company(String.valueOf(card.getOrDefault("companyName", "")))
                        .city(String.valueOf(card.getOrDefault("city", "")))
                        .workingPreference(String.valueOf(card.getOrDefault("workingPreference", "")))
                        .requirements(String.valueOf(card.getOrDefault("requirements", "")))
                        .build())
                .collect(Collectors.toList());

        return ChatResponse.builder()
                .sessionId(request.getSessionId())
                .text(aiText)
                .jobCards(jobCards)
                .build();
    }

    public ChatSession getHistory(String sessionId) {
        return sessionRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new RuntimeException("Oturum bulunamadı: " + sessionId));
    }
}
