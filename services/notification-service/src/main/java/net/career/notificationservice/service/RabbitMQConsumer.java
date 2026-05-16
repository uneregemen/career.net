package net.career.notificationservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.career.notificationservice.event.JobCreatedEvent;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class RabbitMQConsumer {

    private final NotificationService notificationService;

    // ${rabbitmq.queue.job-created} yerine "job.created" değerini application.yml'den okur
    // Job Service bir iş ilanı oluşturduğunda bu metot otomatik çağrılır
    @RabbitListener(queues = "${rabbitmq.queue.job-created}")
    public void onJobCreated(@Payload JobCreatedEvent event) {
        log.info("Yeni iş ilanı kuyruğundan alındı: {}", event.getTitle());
        notificationService.matchAndNotify(event);
    }
}
