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

    // Gemini'ye mesaj gönderir, gerekirse tool call çalıştırır, cevabı döner
    public Map<String, Object> chat(List<Map<String, Object>> history, String userMessage) {
        // Kullanıcının yeni mesajını geçmişe ekle
        List<Map<String, Object>> contents = new ArrayList<>(history);
        contents.add(Map.of("role", "user", "parts", List.of(Map.of("text", userMessage))));

        // Gemini'ye gönderilecek istek gövdesi
        Map<String, Object> requestBody = buildRequest(contents);

        // Gemini'ye gönder
        Map response = geminiClient.post()
                .uri(baseUrl + "?key=" + apiKey)
                .header("Content-Type", "application/json")
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        return handleResponse(response, contents);
    }

    // Gemini'nin cevabını işle: text mi döndü, tool call mı?
    private Map<String, Object> handleResponse(Map response, List<Map<String, Object>> contents) {
        try {
            List candidates = (List) response.get("candidates");
            Map candidate = (Map) candidates.get(0);
            Map content = (Map) candidate.get("content");
            List parts = (List) content.get("parts");
            Map firstPart = (Map) parts.get(0);

            // Tool call (araç çağırma): Gemini bir fonksiyon çağırmamızı istedi
            if (firstPart.containsKey("functionCall")) {
                Map functionCall = (Map) firstPart.get("functionCall");
                String functionName = (String) functionCall.get("name");
                Map<String, Object> args = (Map<String, Object>) functionCall.get("args");

                log.info("Gemini tool call istedi: {} args={}", functionName, args);

                // Fonksiyonu çalıştır ve sonucu al
                Object toolResult = executeTool(functionName, args);

                // Tool sonucunu Gemini'ye geri gönder
                contents.add(Map.of("role", "model", "parts", List.of(Map.of("functionCall", functionCall))));
                contents.add(Map.of("role", "user", "parts", List.of(Map.of(
                        "functionResponse", Map.of(
                                "name", functionName,
                                "response", Map.of("result", toolResult)
                        )
                ))));

                // Gemini'ye tekrar gönder — bu sefer kullanıcıya cevap yazacak
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

            // Düz metin cevabı
            String text = (String) firstPart.get("text");
            return Map.of("text", text, "jobCards", List.of());

        } catch (Exception e) {
            log.error("Gemini yanıtı işlenirken hata: {}", e.getMessage());
            return Map.of("text", "Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.", "jobCards", List.of());
        }
    }

    // Tool çağrısını gerçek API'ye yönlendir
    private Object executeTool(String functionName, Map<String, Object> args) {
        return switch (functionName) {
            case "search_jobs" -> {
                String position = (String) args.getOrDefault("position", "");
                String city = (String) args.getOrDefault("city", "");
                // Search Service'e POST /api/v1/search
                yield searchClient.post()
                        .uri("/api/v1/search")
                        .bodyValue(Map.of("position", position, "city", city, "size", 5))
                        .retrieve()
                        .bodyToMono(Map.class)
                        .block();
            }
            case "get_job_details" -> {
                String id = (String) args.get("id");
                // Job Service'e GET /api/v1/jobs/{id}
                yield jobClient.get()
                        .uri("/api/v1/jobs/" + id)
                        .retrieve()
                        .bodyToMono(Map.class)
                        .block();
            }
            default -> Map.of("error", "Bilinmeyen araç: " + functionName);
        };
    }

    // Gemini cevabından metni ve iş ilanı kartlarını çıkar
    private Map<String, Object> extractTextAndJobs(Map response, Object toolResult) {
        String text = "";
        try {
            List candidates = (List) response.get("candidates");
            Map content = (Map) ((Map) candidates.get(0)).get("content");
            List parts = (List) content.get("parts");
            text = (String) ((Map) parts.get(0)).get("text");
        } catch (Exception e) {
            text = "İşte bulduğum ilanlar:";
        }

        // Tool sonucundan iş kartlarını çıkar
        List<Map<String, Object>> jobCards = extractJobCards(toolResult);
        return Map.of("text", text, "jobCards", jobCards);
    }

    private List<Map<String, Object>> extractJobCards(Object toolResult) {
        try {
            if (toolResult instanceof Map resultMap) {
                Object content = resultMap.get("content");
                if (content instanceof List jobList) {
                    return (List<Map<String, Object>>) jobList;
                }
            }
        } catch (Exception ignored) {}
        return List.of();
    }

    // Gemini'ye gönderilecek tam istek yapısı (system prompt + tools + geçmiş)
    private Map<String, Object> buildRequest(List<Map<String, Object>> contents) {
        return Map.of(
                "system_instruction", Map.of("parts", List.of(Map.of("text",
                        "Sen career.net iş arama asistanısın. " +
                        "Kullanıcı bir iş ararsa search_jobs aracını kullan. " +
                        "İlan detayı isterse get_job_details aracını kullan. " +
                        "Türkçe veya İngilizce konuşabilirsin. " +
                        "Kısa ve yardımcı ol."))),
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
                                                "id", Map.of("type", "string", "description", "İş ilanı ID'si")
                                        ),
                                        "required", List.of("id")
                                )
                        )
                )))
        );
    }
}
