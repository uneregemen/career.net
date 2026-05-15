package net.career.searchservice.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {

    @Value("${services.job-service-url}")
    private String jobServiceUrl;

    @Bean
    public WebClient jobServiceClient() {
        return WebClient.builder()
                .baseUrl(jobServiceUrl)
                .build();
    }
}
