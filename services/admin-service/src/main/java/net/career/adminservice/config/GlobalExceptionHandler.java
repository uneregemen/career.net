package net.career.adminservice.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.HttpClientErrorException;

import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private final ObjectMapper objectMapper = new ObjectMapper();

    // RestTemplate'in job-service'ten aldığı 4xx hatalarını düzgün parse eder
    @ExceptionHandler(HttpClientErrorException.class)
    public ResponseEntity<Map<String, String>> handleHttpClient(HttpClientErrorException ex) {
        String errorMessage = ex.getMessage();
        try {
            String body = ex.getResponseBodyAsString();
            JsonNode node = objectMapper.readTree(body);
            if (node.has("error")) {
                errorMessage = node.get("error").asText();
            }
        } catch (Exception ignored) {}
        return ResponseEntity.status(ex.getStatusCode()).body(Map.of("error", errorMessage));
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> handleRuntime(RuntimeException ex) {
        String msg = ex.getMessage();

        HttpStatus status = msg.contains("not found") ? HttpStatus.NOT_FOUND
                : msg.contains("not verified") ? HttpStatus.FORBIDDEN
                : msg.contains("Admin access required") ? HttpStatus.FORBIDDEN
                : msg.contains("already registered") ? HttpStatus.CONFLICT
                : HttpStatus.BAD_REQUEST;

        return ResponseEntity.status(status).body(Map.of("error", msg));
    }
}
