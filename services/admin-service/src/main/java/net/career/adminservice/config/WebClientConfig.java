package net.career.adminservice.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class WebClientConfig {

    // Reads the job-service URL from application.yml
    @Value("${services.job-service-url}")
    private String jobServiceUrl;

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }

    @Bean
    public String jobServiceUrl() {
        return jobServiceUrl;
    }
}
