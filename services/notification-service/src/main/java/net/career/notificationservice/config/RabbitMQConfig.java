package net.career.notificationservice.config;

import org.springframework.amqp.core.Queue;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    @Value("${rabbitmq.queue.job-created}")
    private String jobCreatedQueue;

    // Kuyruğun var olduğundan emin olmak için tanımlarız
    // durable = true: RabbitMQ yeniden başlasa bile kuyruk silinmez
    @Bean
    public Queue jobCreatedQueue() {
        return new Queue(jobCreatedQueue, true);
    }

    // Mesajları JSON olarak okuyup yazmak için
    @Bean
    public Jackson2JsonMessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(messageConverter());
        return template;
    }
}
