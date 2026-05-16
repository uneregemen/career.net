package net.career.aiagentservice.dto;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ChatRequest {
    private String sessionId;   // oturum kimliği — aynı sohbeti sürdürmek için
    private String message;     // kullanıcının yazdığı metin
}
