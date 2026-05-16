package net.career.aiagentservice.repository;

import net.career.aiagentservice.model.ChatSession;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface ChatSessionRepository extends MongoRepository<ChatSession, String> {

    // sessionId ile sohbet geçmişini bul
    Optional<ChatSession> findBySessionId(String sessionId);
}
