package net.career.aiagentservice.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "ai_chat_sessions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ChatSession {

    @Id
    private String id;

    private String sessionId;   // frontend'in ürettiği benzersiz oturum kimliği
    private String userId;      // null ise anonim kullanıcı

    @Builder.Default
    private List<ChatMessage> messages = new ArrayList<>();

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Tek bir mesajı temsil eder: kullanıcının sorusu veya AI'ın cevabı
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ChatMessage {
        private String role;      // "user" veya "assistant"
        private String content;
        private LocalDateTime timestamp;
    }
}
