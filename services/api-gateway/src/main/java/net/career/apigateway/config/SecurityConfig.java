package net.career.apigateway.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.web.server.SecurityWebFilterChain;

@Configuration
@EnableWebFluxSecurity   // WebFlux için — normal @EnableWebSecurity değil
public class SecurityConfig {

    @Bean
    public SecurityWebFilterChain springSecurityFilterChain(ServerHttpSecurity http) {
        http
            .csrf(csrf -> csrf.disable())
            .authorizeExchange(auth -> auth
                // İş ilanları herkese açık
                .pathMatchers(HttpMethod.GET, "/api/v1/jobs/**").permitAll()
                // Arama herkese açık
                .pathMatchers(HttpMethod.POST, "/api/v1/search").permitAll()
                .pathMatchers(HttpMethod.GET,  "/api/v1/search/results").permitAll()
                // AI chat anonim kullanıcıya da açık
                .pathMatchers("/api/v1/ai/**").permitAll()
                // Scheduler endpoint'leri — EventBridge'den gelir, iç ağdan
                .pathMatchers("/api/v1/scheduler/**").permitAll()
                // Geri kalan her şey için login gerekli
                .anyExchange().authenticated()
            )
            // Cognito JWKS ile JWT doğrulama
            .oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> {}));

        return http.build();
    }
}
