package net.career.aiagentservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class GeminiService {

    private final WebClient geminiClient;
    private final WebClient searchClient;
    private final WebClient jobClient;

    @Value("${gemini.api-key}")
    private String apiKey;

    @Value("${gemini.base-url}")
    private String baseUrl;

    public Map<String, Object> chat(List<Map<String, Object>> history, String userMessage, String bearerToken) {
        try {
            List<Map<String, Object>> contents = new ArrayList<>(history);
            contents.add(Map.of("role", "user", "parts", List.of(Map.of("text", userMessage))));

            Map<String, Object> requestBody = buildRequest(contents);

            Map response = geminiClient.post()
                    .uri(baseUrl + "?key=" + apiKey)
                    .header("Content-Type", "application/json")
                    .bodyValue(requestBody)
                    .retrieve()
                    .onStatus(status -> !status.is2xxSuccessful(), clientResponse ->
                            clientResponse.bodyToMono(String.class)
                                    .map(body -> new RuntimeException("Gemini API hatası " + clientResponse.statusCode() + ": " + body))
                    )
                    .bodyToMono(Map.class)
                    .block();

            return handleResponse(response, contents, bearerToken);
        } catch (Exception e) {
            log.error("Gemini chat hatası: {}", e.getMessage());
            String msg = e.getMessage() != null && e.getMessage().contains("429")
                    ? "API kotası doldu. Lütfen 1-2 dakika bekleyip tekrar deneyin."
                    : "Şu an yanıt üretemiyorum. Lütfen tekrar deneyin.";
            return Map.of("text", msg, "jobCards", List.of());
        }
    }

    private Map<String, Object> handleResponse(Map response, List<Map<String, Object>> contents, String bearerToken) {
        try {
            List candidates = (List) response.get("candidates");
            Map candidate = (Map) candidates.get(0);
            Map content = (Map) candidate.get("content");
            List parts = (List) content.get("parts");
            Map firstPart = (Map) parts.get(0);

            if (firstPart.containsKey("functionCall")) {
                Map functionCall = (Map) firstPart.get("functionCall");
                String functionName = (String) functionCall.get("name");
                Map<String, Object> args = (Map<String, Object>) functionCall.get("args");

                log.info("Gemini tool call: {} args={}", functionName, args);
                Object toolResult = executeTool(functionName, args, bearerToken);

                contents.add(Map.of("role", "model", "parts", List.of(Map.of("functionCall", functionCall))));
                contents.add(Map.of("role", "user", "parts", List.of(Map.of(
                        "functionResponse", Map.of(
                                "name", functionName,
                                "response", Map.of("result", toolResult)
                        )
                ))));

                Map<String, Object> followUpBody = buildRequest(contents);
                Map followUpResponse = geminiClient.post()
                        .uri(baseUrl + "?key=" + apiKey)
                        .header("Content-Type", "application/json")
                        .bodyValue(followUpBody)
                        .retrieve()
                        .bodyToMono(Map.class)
                        .block();

                return extractTextAndJobs(followUpResponse, toolResult);
            }

            String text = (String) firstPart.get("text");
            return Map.of("text", text != null ? text : "", "jobCards", List.of());

        } catch (Exception e) {
            log.error("Gemini yanıtı işlenirken hata: {}", e.getMessage());
            return Map.of("text", "Bir hata oluştu, lütfen tekrar deneyin.", "jobCards", List.of());
        }
    }

    private Object executeTool(String functionName, Map<String, Object> args, String bearerToken) {
        return switch (functionName) {
            case "search_jobs" -> {
                String position = (String) args.getOrDefault("position", "");
                String city = (String) args.getOrDefault("city", "");
                yield searchClient.post()
                        .uri("/api/v1/search")
                        .bodyValue(Map.of("position", position, "city", city, "size", 5))
                        .retrieve()
                        .bodyToMono(Map.class)
                        .block();
            }
            case "get_job_details" -> {
                String id = (String) args.get("id");
                yield jobClient.get()
                        .uri("/api/v1/jobs/" + id)
                        .retrieve()
                        .bodyToMono(Map.class)
                        .block();
            }
            case "apply_job" -> {
                String jobId = (String) args.get("jobId");
                if (bearerToken == null || bearerToken.isBlank())
                    yield Map.of("error", "Başvuru için giriş yapmanız gerekiyor.");
                try {
                    yield jobClient.post()
                            .uri("/api/v1/jobs/" + jobId + "/apply")
                            .header("Authorization", bearerToken)
                            .retrieve()
                            .bodyToMono(Map.class)
                            .block();
                } catch (Exception e) {
                    yield Map.of("error", "Başvuru başarısız: " + e.getMessage());
                }
            }
            default -> Map.of("error", "Bilinmeyen araç: " + functionName);
        };
    }

    private Map<String, Object> extractTextAndJobs(Map response, Object toolResult) {
        String text = "İşte bulduğum ilanlar:";
        try {
            List candidates = (List) response.get("candidates");
            Map content = (Map) ((Map) candidates.get(0)).get("content");
            List parts = (List) content.get("parts");
            text = (String) ((Map) parts.get(0)).get("text");
            if (text == null) text = "İşte bulduğum ilanlar:";
        } catch (Exception ignored) {}

        List<Map<String, Object>> jobCards = List.of();
        try {
            if (toolResult instanceof Map m && m.get("content") instanceof List list)
                jobCards = (List<Map<String, Object>>) list;
        } catch (Exception ignored) {}

        return Map.of("text", text, "jobCards", jobCards);
    }

    private Map<String, Object> buildRequest(List<Map<String, Object>> contents) {
        return Map.of(
                "system_instruction", Map.of("parts", List.of(Map.of("text",
                        "Sen career.net iş arama asistanısın. " +
                        "Kullanıcı iş ararsa search_jobs aracını kullan. " +
                        "İlan detayı isterse get_job_details aracını kullan. " +
                        "Kullanıcı bir ilana başvurmak isterse apply_job aracını kullan; öncesinde ilan id'sini teyit et. " +
                        "Türkçe veya İngilizce konuşabilirsin. Kısa ve yardımcı ol."))),
                "contents", contents,
                "tools", List.of(Map.of("functionDeclarations", List.of(
                        Map.of(
                                "name", "search_jobs",
                                "description", "İş ilanı ara",
                                "parameters", Map.of(
                                        "type", "object",
                                        "properties", Map.of(
                                                "position", Map.of("type", "string", "description", "Pozisyon veya iş başlığı"),
                                                "city",     Map.of("type", "string", "description", "Şehir adı")
                                        )
                                )
                        ),
                        Map.of(
                                "name", "get_job_details",
                                "description", "Belirli bir iş ilanının detaylarını getir",
                                "parameters", Map.of(
                                        "type", "object",
                                        "properties", Map.of(
                                                "id", Map.of("type", "string", "description", "İş ilanı UUID'si")
                                        ),
                                        "required", List.of("id")
                                )
                        ),
                        Map.of(
                                "name", "apply_job",
                                "description", "Kullanıcı adına bir iş ilanına başvur",
                                "parameters", Map.of(
                                        "type", "object",
                                        "properties", Map.of(
                                                "jobId", Map.of("type", "string", "description", "Başvurulacak ilanın UUID'si")
                                        ),
                                        "required", List.of("jobId")
                                )
                        )
                )))
        );
    }
}
