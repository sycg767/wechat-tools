package com.wechat.tools.service;

import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Locale;

@Service
public class BaguaAiService {

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(20))
            .build();

    public String interpret(String question, JSONObject primaryHexagram, JSONObject changedHexagram,
                            JSONArray changingLines, String aiBaseUrl, String aiModel, String aiApiKey) {
        String url = normalizeUrl(aiBaseUrl);
        String systemPrompt = buildSystemPrompt();
        String userMessage = buildUserMessage(question, primaryHexagram, changedHexagram, changingLines);
        return callLlm(url, aiModel, aiApiKey, systemPrompt, userMessage);
    }

    private String normalizeUrl(String aiBaseUrl) {
        String url = aiBaseUrl == null ? "" : aiBaseUrl.trim();
        if (url.isBlank()) throw new IllegalArgumentException("AI 请求地址不能为空");
        URI uri;
        try { uri = URI.create(url); }
        catch (Exception e) { throw new IllegalArgumentException("AI 请求地址格式无效"); }
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
        if (!"http".equals(scheme) && !"https".equals(scheme))
            throw new IllegalArgumentException("AI 请求地址仅支持 http 或 https");
        String host = uri.getHost() == null ? "" : uri.getHost().trim().toLowerCase(Locale.ROOT);
        if (host.isBlank()) throw new IllegalArgumentException("AI 请求地址缺少主机名");
        if ("localhost".equals(host) || "127.0.0.1".equals(host) || "0.0.0.0".equals(host) || "::1".equals(host))
            throw new IllegalArgumentException("AI 请求地址不允许使用本机回环地址");
        if (!url.endsWith("/chat/completions"))
            url = url.replaceAll("/+$", "") + "/chat/completions";
        return url;
    }

    private String buildSystemPrompt() {
        return "你是一位擅长用易经智慧辅助自我梳理的顾问。用户会提供：提出的事项、本卦（含卦名、上下卦、卦辞）、动爻位置与变化方向、变卦。\n\n" +
               "请基于以上信息，用简洁、平实的中文给出以下四部分（每部分2-3句话，避免重复）：\n" +
               "1. 本卦解读：一句话概括本卦核心含义，再一句话结合用户事项。\n" +
               "2. 动爻分析：具体指出动爻位置（初爻/二爻等）代表的阶段和变化信号，避免空泛。\n" +
               "3. 变卦方向：本卦到变卦的变化说明了什么趋势，直接给结论。\n" +
               "4. 行动建议：2-3条具体可操作的建议。\n\n" +
               "格式要求：每部分标题前加 ### 符号作为小标题，正文用普通文字不加粗。各部分之间用空行分隔。\n" +
               "风格要求：语言简洁自然，不要宣扬宿命论或确定性预测，强调自我梳理和行动提醒。不引用卦辞古文，用现代语言表达。直接给出四部分内容，不要开头问候语和结尾祝福。";
    }

    private String buildUserMessage(String question, JSONObject primaryHexagram, JSONObject changedHexagram, JSONArray changingLines) {
        StringBuilder sb = new StringBuilder();
        sb.append("我关心的事项：").append(question.isBlank() ? "今日整体状态" : question).append("\n\n");
        sb.append("本卦：第").append(primaryHexagram.optInt("number")).append("卦 ")
                .append(primaryHexagram.optString("name")).append("\n")
                .append("上").append(primaryHexagram.optString("upper")).append(" 下").append(primaryHexagram.optString("lower")).append("\n")
                .append("卦辞：").append(primaryHexagram.optString("judgement", "")).append("\n\n");
        if (changingLines != null && changingLines.length() > 0) {
            sb.append("动爻：\n");
            for (int i = 0; i < changingLines.length(); i++) {
                JSONObject line = changingLines.optJSONObject(i);
                if (line != null) {
                    sb.append("  ").append(line.optString("label")).append("：").append(line.optString("text", "")).append("\n");
                }
            }
            sb.append("\n");
        }
        sb.append("变卦：第").append(changedHexagram.optInt("number")).append("卦 ")
                .append(changedHexagram.optString("name")).append("\n")
                .append("上").append(changedHexagram.optString("upper")).append(" 下").append(changedHexagram.optString("lower")).append("\n")
                .append("卦辞：").append(changedHexagram.optString("judgement", "")).append("\n");
        return sb.toString();
    }

    private String callLlm(String url, String model, String apiKey, String systemPrompt, String userMessage) {
        JSONObject systemMsg = new JSONObject().put("role", "system").put("content", systemPrompt);
        JSONObject userMsg = new JSONObject().put("role", "user").put("content", userMessage);
        JSONObject payload = new JSONObject()
                .put("model", model)
                .put("messages", new JSONArray().put(systemMsg).put(userMsg))
                .put("temperature", 0.7)
                .put("max_tokens", 4096)
                .put("stream", false);

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(60))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(payload.toString()))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                String body = response.body();
                String detail = "";
                if (body != null && !body.isBlank()) {
                    try { detail = " - " + new JSONObject(body).optJSONObject("error") != null
                            ? new JSONObject(body).getJSONObject("error").optString("message", body)
                            : body; } catch (Exception ignored) {}
                }
                throw new IllegalStateException("AI 请求失败: HTTP " + response.statusCode() + detail);
            }
            return extractMessageText(response.body());
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("AI 解读请求异常: " + e.getMessage());
        }
    }

    private String extractMessageText(String body) {
        JSONObject json = new JSONObject(body);
        if (json.has("error")) {
            Object error = json.get("error");
            if (error instanceof JSONObject errorObj) {
                throw new IllegalStateException(errorObj.optString("message", "AI 解读失败"));
            }
            throw new IllegalStateException("AI 解读失败");
        }
        JSONArray choices = json.optJSONArray("choices");
        if (choices == null || choices.length() == 0) {
            throw new IllegalStateException("AI 未返回解读结果");
        }
        JSONObject first = choices.optJSONObject(0);
        JSONObject message = first == null ? null : first.optJSONObject("message");
        if (message == null) {
            throw new IllegalStateException("AI 返回结果缺少 message");
        }
        Object content = message.opt("content");
        if (content instanceof String text) {
            String trimmed = text.trim();
            if (trimmed.isBlank()) throw new IllegalStateException("AI 返回文本为空");
            return trimmed;
        }
        throw new IllegalStateException("AI 返回 content 格式异常");
    }
}
