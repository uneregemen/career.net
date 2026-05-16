package net.career.aiagentservice.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {

    @Value("${services.search-service-url}")
    private String searchServiceUrl;

    @Value("${services.job-service-url}")
    private String jobServiceUrl;

    // Gemini API'sine istek atmak için — base URL yok, her çağrıda tam URL veriyoruz
    @Bean
    public WebClient geminiClient() {
        return WebClient.builder().build();
    }

    // İç servislere çağrı için
    @Bean
    public WebClient searchClient() {
        return WebClient.builder().baseUrl(searchServiceUrl).build();
    }

    @Bean
    public WebClient jobClient() {
        return WebClient.builder().baseUrl(jobServiceUrl).build();
    }
}
