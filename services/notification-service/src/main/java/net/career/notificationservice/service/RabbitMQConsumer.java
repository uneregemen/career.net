package net.career.notificationservice.service;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.career.notificationservice.event.JobCreatedEvent;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class RabbitMQConsumer {

    private final NotificationService notificationService;

    @PostConstruct
    public void init() {
        log.info("RabbitMQConsumer bean oluşturuldu — listener başlatılmayı bekliyor");
    }

    @RabbitListener(queues = "${rabbitmq.queue.job-created}")
    public void onJobCreated(JobCreatedEvent event) {
        log.info("Yeni iş ilanı kuyruğundan alındı: {}", event.getTitle());
        notificationService.matchAndNotify(event);
    }
}
