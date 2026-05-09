package com.wechat.tools.controller;

import com.wechat.tools.common.BizException;
import com.wechat.tools.common.FileTaskTemplate;
import com.wechat.tools.common.Result;
import com.wechat.tools.task.FileConversionTask;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Markdown 转 PDF / Word：输入是 Markdown 字符串而非文件，所以走 submitNoFile 路径。
 */
@RestController
@RequestMapping("/tool")
public class MarkdownController {

    private static final int MAX_MD_LENGTH = 200_000; // 约 20 万字，足够覆盖长文档

    private final FileTaskTemplate fileTaskTemplate;
    private final FileConversionTask fileConversionTask;

    public MarkdownController(FileTaskTemplate fileTaskTemplate, FileConversionTask fileConversionTask) {
        this.fileTaskTemplate = fileTaskTemplate;
        this.fileConversionTask = fileConversionTask;
    }

    @PostMapping(value = "/md-to-pdf", consumes = "application/json")
    public Result<String> mdToPdf(@RequestBody Map<String, Object> payload) {
        String content = extractContent(payload);
        String title = extractTitle(payload, "Markdown文档.pdf");
        return fileTaskTemplate.submitNoFile("md-pdf", title,
                taskId -> fileConversionTask.processMdToPdf(taskId, content, title));
    }

    @PostMapping(value = "/md-to-word", consumes = "application/json")
    public Result<String> mdToWord(@RequestBody Map<String, Object> payload) {
        String content = extractContent(payload);
        String title = extractTitle(payload, "Markdown文档.doc");
        return fileTaskTemplate.submitNoFile("md-word", title,
                taskId -> fileConversionTask.processMdToWord(taskId, content, title));
    }

    private static String extractContent(Map<String, Object> payload) {
        String content = payload == null ? null : (String) payload.get("content");
        if (content == null || content.isBlank()) {
            throw new BizException("内容不能为空");
        }
        if (content.length() > MAX_MD_LENGTH) {
            throw new BizException("内容过长，请控制在 " + MAX_MD_LENGTH + " 字以内");
        }
        return content;
    }

    private static String extractTitle(Map<String, Object> payload, String fallback) {
        String title = payload == null ? null : (String) payload.get("title");
        if (title == null || title.isBlank()) {
            return fallback;
        }
        return title.trim();
    }
}
