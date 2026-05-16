package net.career.notificationservice.repository;

import net.career.notificationservice.model.JobSearchDocument;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface JobSearchDocumentRepository extends MongoRepository<JobSearchDocument, String> {

    // Son X gün içinde arama yapan tüm kullanıcıların aramalarını getir
    List<JobSearchDocument> findByCreatedAtAfterAndUserIdNotNull(LocalDateTime after);
}
