package com.wechat.tools.controller;

import com.wechat.tools.common.BizException;
import com.wechat.tools.common.FileTaskTemplate;
import com.wechat.tools.common.Result;
import com.wechat.tools.entity.QrShortCodeEntity;
import com.wechat.tools.repository.QrShortCodeRepository;
import com.wechat.tools.task.FileConversionTask;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import org.springframework.web.util.HtmlUtils;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/tool")
public class QrController {

    private static final int QR_SHORT_TEXT_MAX_LEN = 4000;
    private static final String SHORT_CODE_CHARS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    private static final int SHORT_CODE_LENGTH = 8;
    private static final int SHORT_CODE_TTL_DAYS = 7;
    private static final SecureRandom SHORT_CODE_RANDOM = new SecureRandom();

    private final QrShortCodeRepository qrShortCodeRepository;
    private final FileTaskTemplate fileTaskTemplate;
    private final FileConversionTask fileConversionTask;

    @Value("${app.qr.public-base-url:}")
    private String qrPublicBaseUrl;

    public QrController(QrShortCodeRepository qrShortCodeRepository,
                        FileTaskTemplate fileTaskTemplate,
                        FileConversionTask fileConversionTask) {
        this.qrShortCodeRepository = qrShortCodeRepository;
        this.fileTaskTemplate = fileTaskTemplate;
        this.fileConversionTask = fileConversionTask;
    }

    @PostMapping(value = "/qr-create-short-link", consumes = "application/json")
    public Result<Map<String, String>> createQrShortLink(@RequestBody Map<String, Object> payload,
                                                         HttpServletRequest request) {
        String content = payload == null ? null : (String) payload.get("content");
        if (content == null || content.isBlank()) {
            throw new BizException("内容不能为空");
        }
        if (content.length() > QR_SHORT_TEXT_MAX_LEN) {
            throw new BizException("内容过长，请控制在 " + QR_SHORT_TEXT_MAX_LEN + " 字以内");
        }
        String code = generateUniqueShortCode();
        QrShortCodeEntity entity = new QrShortCodeEntity();
        entity.setCode(code);
        entity.setContent(content);
        entity.setExpiresAt(LocalDateTime.now().plusDays(SHORT_CODE_TTL_DAYS));
        qrShortCodeRepository.save(entity);

        String shortUrl = buildShortUrl(request, code);
        return Result.success(Map.of("code", code, "shortUrl", shortUrl));
    }

    @GetMapping("/qr/s/{code}")
    public ResponseEntity<String> resolveQrShortLink(@PathVariable("code") String code) {
        String content = lookupContent(code);
        if (content == null) {
            return ResponseEntity.status(404)
                    .contentType(MediaType.parseMediaType("text/html;charset=UTF-8"))
                    .body(notFoundHtml());
        }
        String escapedText = HtmlUtils.htmlEscape(content, StandardCharsets.UTF_8.name())
                .replace("\n", "<br/>");
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/html;charset=UTF-8"))
                .body(contentHtml(escapedText));
    }

    @GetMapping("/qr-content/{code}")
    public Result<Map<String, String>> getQrContent(@PathVariable("code") String code) {
        String content = lookupContent(code);
        if (content == null) {
            throw new BizException(404, "内容不存在或已失效");
        }
        return Result.success(Map.of("code", code, "content", content));
    }

    @PostMapping(value = "/qr-generate", consumes = "application/json")
    public Result<String> qrGenerate(@RequestBody Map<String, Object> payload) {
        String content = payload == null ? null : (String) payload.get("content");
        Integer size = payload == null ? 300 : (Integer) payload.getOrDefault("size", 300);
        if (content == null || content.isBlank()) {
            throw new BizException("内容不能为空");
        }
        return fileTaskTemplate.submitNoFile("qr-generate", "二维码生成",
                taskId -> fileConversionTask.processQrGenerate(taskId, content, size));
    }

    @PostMapping("/qr-decode")
    public Result<String> qrDecode(@RequestParam("file") MultipartFile file,
                                   @RequestParam(value = "originalFileName", required = false) String originalFileName) {
        return fileTaskTemplate.submit(file)
                .originalName(originalFileName)
                .asTask("qr-decode")
                .run(ctx -> fileConversionTask.processQrDecode(ctx.taskId(), ctx.fileId()));
    }

    private String lookupContent(String code) {
        return qrShortCodeRepository.findByCodeAndExpiresAtAfter(code, LocalDateTime.now())
                .map(QrShortCodeEntity::getContent)
                .orElse(null);
    }

    private String generateUniqueShortCode() {
        for (int i = 0; i < 10; i++) {
            String code = randomShortCode();
            if (!qrShortCodeRepository.existsById(code)) {
                return code;
            }
        }
        throw new BizException(500, "短链生成失败，请稍后重试");
    }

    private String randomShortCode() {
        StringBuilder sb = new StringBuilder(SHORT_CODE_LENGTH);
        for (int i = 0; i < SHORT_CODE_LENGTH; i++) {
            int index = SHORT_CODE_RANDOM.nextInt(SHORT_CODE_CHARS.length());
            sb.append(SHORT_CODE_CHARS.charAt(index));
        }
        return sb.toString();
    }

    private String buildShortUrl(HttpServletRequest request, String code) {
        if (qrPublicBaseUrl != null && !qrPublicBaseUrl.isBlank()) {
            String base = qrPublicBaseUrl.endsWith("/")
                    ? qrPublicBaseUrl.substring(0, qrPublicBaseUrl.length() - 1)
                    : qrPublicBaseUrl;
            return base + "/api/tool/qr/s/" + code;
        }
        return ServletUriComponentsBuilder.fromRequestUri(request)
                .replacePath("/api/tool/qr/s/{code}")
                .replaceQuery(null)
                .buildAndExpand(code)
                .toUriString();
    }

    private static String notFoundHtml() {
        return """
                <!doctype html>
                <html lang="zh-CN"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>内容不存在</title>
                <style>body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,PingFang SC,Hiragino Sans GB,Microsoft YaHei,sans-serif;background:#f7f8fa;margin:0;padding:24px;color:#333}.card{max-width:680px;margin:0 auto;background:#fff;border-radius:12px;padding:20px;box-shadow:0 4px 16px rgba(0,0,0,.06)}h1{font-size:20px;margin:0 0 12px}p{font-size:15px;line-height:1.7;margin:0}</style>
                </head><body><div class="card"><h1>内容不存在或已失效</h1><p>请返回小程序重新生成二维码。</p></div></body></html>
                """;
    }

    private static String contentHtml(String escapedText) {
        return """
                <!doctype html>
                <html lang="zh-CN"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>二维码内容</title>
                <style>body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,PingFang SC,Hiragino Sans GB,Microsoft YaHei,sans-serif;background:#f7f8fa;margin:0;padding:24px;color:#333}.card{max-width:680px;margin:0 auto;background:#fff;border-radius:12px;padding:20px;box-shadow:0 4px 16px rgba(0,0,0,.06)}.content{font-size:15px;line-height:1.8;word-break:break-all;white-space:normal}</style>
                </head><body><div class="card"><div class="content">%s</div></div></body></html>
                """.formatted(escapedText);
    }
}
