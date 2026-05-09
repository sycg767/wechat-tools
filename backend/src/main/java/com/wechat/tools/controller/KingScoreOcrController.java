package com.wechat.tools.controller;

import com.wechat.tools.common.BizException;
import com.wechat.tools.common.FileTaskTemplate;
import com.wechat.tools.common.Result;
import com.wechat.tools.task.FileConversionTask;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * 王者荣耀战绩截图 OCR：支持本地 OCR 与外部 AI 模型。
 */
@RestController
@RequestMapping("/tool")
public class KingScoreOcrController {

    private final FileTaskTemplate fileTaskTemplate;
    private final FileConversionTask fileConversionTask;

    public KingScoreOcrController(FileTaskTemplate fileTaskTemplate, FileConversionTask fileConversionTask) {
        this.fileTaskTemplate = fileTaskTemplate;
        this.fileConversionTask = fileConversionTask;
    }

    @PostMapping("/king-score-ocr")
    public Result<String> kingScoreOcr(@RequestParam("file") MultipartFile file,
                                       @RequestParam(value = "originalFileName", required = false) String originalFileName,
                                       @RequestParam(value = "ocrMode", required = false) String ocrMode,
                                       @RequestParam(value = "aiBaseUrl", required = false) String aiBaseUrl,
                                       @RequestParam(value = "aiModel", required = false) String aiModel,
                                       @RequestParam(value = "aiApiKey", required = false) String aiApiKey) {
        String resolvedMode = (ocrMode == null || ocrMode.isBlank()) ? "default" : ocrMode.trim().toLowerCase();
        if (!List.of("default", "ai").contains(resolvedMode)) {
            throw new BizException("不支持的识别方式");
        }
        String resolvedAiBaseUrl = aiBaseUrl == null ? "" : aiBaseUrl.trim();
        String resolvedAiModel = aiModel == null ? "" : aiModel.trim();
        String resolvedAiApiKey = aiApiKey == null ? "" : aiApiKey.trim();
        if ("ai".equals(resolvedMode)
                && (resolvedAiBaseUrl.isBlank() || resolvedAiModel.isBlank() || resolvedAiApiKey.isBlank())) {
            throw new BizException("AI 识别方式下，请填写请求地址、模型和密钥");
        }

        return fileTaskTemplate.submit(file)
                .originalName(originalFileName)
                .requireContentTypePrefix("image/")
                .asTask("king-score-ocr")
                .run(ctx -> fileConversionTask.processKingScoreOcr(
                        ctx.taskId(), ctx.fileId(), ctx.fileName(),
                        resolvedMode, resolvedAiBaseUrl, resolvedAiModel, resolvedAiApiKey));
    }
}
