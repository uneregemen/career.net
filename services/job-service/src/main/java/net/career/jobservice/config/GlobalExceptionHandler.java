package net.career.jobservice.config;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> handleRuntime(RuntimeException ex) {
        HttpStatus status = ex.getMessage().contains("not found") ? HttpStatus.NOT_FOUND
                : ex.getMessage().contains("Not authorized") ? HttpStatus.FORBIDDEN
                : ex.getMessage().contains("Already applied") ? HttpStatus.CONFLICT
                : ex.getMessage().contains("not verified") ? HttpStatus.FORBIDDEN
                : HttpStatus.BAD_REQUEST;

        return ResponseEntity.status(status).body(Map.of("error", ex.getMessage()));
    }
}
