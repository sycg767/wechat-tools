package com.wechat.tools.controller;

import com.wechat.tools.common.BizException;
import com.wechat.tools.common.FileTaskTemplate;
import com.wechat.tools.common.Result;
import com.wechat.tools.service.FileStorageService;
import com.wechat.tools.service.TaskService;
import com.wechat.tools.task.FileConversionTask;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;

/**
 * PDF 高级操作：合并、拆分、页面管理、水印、预览。
 * 部分接口返回同步结果（preview），其余统一走异步任务。
 */
@RestController
@RequestMapping("/tool")
public class PdfController {

    private final FileTaskTemplate fileTaskTemplate;
    private final FileConversionTask fileConversionTask;
    private final FileStorageService fileStorageService;
    private final TaskService taskService;

    public PdfController(FileTaskTemplate fileTaskTemplate,
                         FileConversionTask fileConversionTask,
                         FileStorageService fileStorageService,
                         TaskService taskService) {
        this.fileTaskTemplate = fileTaskTemplate;
        this.fileConversionTask = fileConversionTask;
        this.fileStorageService = fileStorageService;
        this.taskService = taskService;
    }

    @PostMapping("/pdf-merge")
    public Result<String> pdfMerge(@RequestParam("files") MultipartFile[] files) throws IOException {
        if (files == null || files.length < 2) {
            throw new BizException("请至少上传两个 PDF 文件进行合并");
        }
        List<String> sourceFileIds = new ArrayList<>();
        for (MultipartFile file : files) {
            if (file.isEmpty()) {
                continue;
            }
            String fileId = fileStorageService.uploadFile(
                    file.getOriginalFilename(),
                    file.getInputStream(),
                    file.getSize(),
                    file.getContentType());
            sourceFileIds.add(fileId);
        }
        if (sourceFileIds.size() < 2) {
            throw new BizException("有效文件不足，无法合并");
        }
        String sourceFileName = sourceFileIds.size() + "个PDF合并";
        String taskId = taskService.createTask("pdf-merge", sourceFileName);
        fileConversionTask.processPdfMerge(taskId, sourceFileIds, "merged.pdf");
        return Result.success(taskId, "任务已创建");
    }

    @PostMapping("/pdf-merge-by-ids")
    public Result<String> pdfMergeByIds(@RequestBody Map<String, Object> payload) {
        @SuppressWarnings("unchecked")
        List<String> fileIds = (List<String>) payload.get("fileIds");
        String customFileName = (String) payload.get("fileName");
        String sourceFileName = (String) payload.get("sourceFileName");

        if (fileIds == null || fileIds.size() < 2) {
            throw new BizException("请至少提供两个文件ID进行合并");
        }
        String resultFileName = customFileName != null && !customFileName.isBlank()
                ? customFileName.trim() : "merged.pdf";
        if (!resultFileName.toLowerCase().endsWith(".pdf")) {
            resultFileName += ".pdf";
        }
        String finalSourceFileName = sourceFileName != null && !sourceFileName.isBlank()
                ? sourceFileName.trim() : "多个PDF合并";

        String taskId = taskService.createTask("pdf-merge", finalSourceFileName);
        fileConversionTask.processPdfMerge(taskId, fileIds, resultFileName);
        return Result.success(taskId, "任务已创建");
    }

    @PostMapping("/pdf-split")
    public Result<String> pdfSplit(@RequestParam("file") MultipartFile file,
                                   @RequestParam(value = "range", required = false) String range,
                                   @RequestParam(value = "originalFileName", required = false) String originalFileName) {
        return fileTaskTemplate.submit(file)
                .originalName(originalFileName)
                .asTask("pdf-split")
                .run(ctx -> fileConversionTask.processPdfSplit(ctx.taskId(), ctx.fileId(), ctx.fileName(), range));
    }

    @PostMapping("/pdf-page-manage")
    public Result<String> pdfPageManage(@RequestParam("file") MultipartFile file,
                                        @RequestParam(value = "pagesJson", required = false) String pagesJson,
                                        @RequestParam(value = "pageRange", required = false) String pageRange,
                                        @RequestParam(value = "rotation", required = false) Integer rotation,
                                        @RequestParam(value = "originalFileName", required = false) String originalFileName) {
        return fileTaskTemplate.submit(file)
                .originalName(originalFileName)
                .asTask("pdf-page-manage")
                .run(ctx -> fileConversionTask.processPdfPageManage(
                        ctx.taskId(), ctx.fileId(), ctx.fileName(), pagesJson, pageRange, rotation));
    }

    @PostMapping("/pdf-page-manage-preview")
    public Result<Map<String, Object>> pdfPageManagePreview(@RequestParam("file") MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new BizException("文件不能为空");
        }
        final int maxPages = 80;
        final int dpi = 40;

        try (PDDocument document = PDDocument.load(file.getBytes())) {
            int totalPages = document.getNumberOfPages();
            if (totalPages <= 0) {
                throw new BizException("PDF 无内容");
            }
            int previewCount = Math.min(totalPages, maxPages);
            PDFRenderer renderer = new PDFRenderer(document);
            List<Map<String, Object>> pages = new ArrayList<>();
            for (int i = 0; i < previewCount; i++) {
                BufferedImage image = renderer.renderImageWithDPI(i, dpi);
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                ImageIO.write(image, "png", baos);
                String base64 = Base64.getEncoder().encodeToString(baos.toByteArray());
                pages.add(Map.of(
                        "pageNo", i + 1,
                        "thumbnailBase64", "data:image/png;base64," + base64,
                        "width", image.getWidth(),
                        "height", image.getHeight(),
                        "rotation", document.getPage(i).getRotation()
                ));
            }
            return Result.success(Map.of(
                    "pages", pages,
                    "totalPages", totalPages,
                    "previewCount", previewCount,
                    "truncated", totalPages > maxPages
            ));
        }
    }

    @PostMapping("/pdf-preview")
    public Result<Map<String, Object>> pdfPreview(@RequestParam("file") MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new BizException("文件不能为空");
        }
        try (PDDocument document = PDDocument.load(file.getBytes())) {
            if (document.getNumberOfPages() == 0) {
                throw new BizException("PDF 无内容");
            }
            PDFRenderer renderer = new PDFRenderer(document);
            BufferedImage image = renderer.renderImageWithDPI(0, 72);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(image, "png", baos);
            String base64 = Base64.getEncoder().encodeToString(baos.toByteArray());
            return Result.success(Map.of(
                    "preview", "data:image/png;base64," + base64,
                    "width", image.getWidth(),
                    "height", image.getHeight()
            ));
        }
    }

    @PostMapping("/pdf-add-watermark")
    public Result<String> pdfAddWatermark(@RequestParam("file") MultipartFile file,
                                          @RequestParam(value = "watermarkImage", required = false) MultipartFile watermarkImage,
                                          @RequestParam(value = "imageFileId", required = false) String imageFileId,
                                          @RequestParam(value = "watermarkText", required = false) String watermarkText,
                                          @RequestParam(value = "type", defaultValue = "text") String type,
                                          @RequestParam(value = "layout", defaultValue = "center") String layout,
                                          @RequestParam(value = "x", defaultValue = "0") float x,
                                          @RequestParam(value = "y", defaultValue = "0") float y,
                                          @RequestParam(value = "opacity", defaultValue = "0.5") float opacity,
                                          @RequestParam(value = "rotation", defaultValue = "45") float rotation,
                                          @RequestParam(value = "scale", defaultValue = "1.0") float scale,
                                          @RequestParam(value = "fontSize", defaultValue = "30") int fontSize,
                                          @RequestParam(value = "color", defaultValue = "#969696") String color,
                                          @RequestParam(value = "originalFileName", required = false) String originalFileName) throws IOException {
        // 水印图片可选上传
        String uploadedImageFileId = imageFileId;
        if ("image".equals(type) && watermarkImage != null && !watermarkImage.isEmpty()) {
            uploadedImageFileId = fileStorageService.uploadFile(
                    watermarkImage.getOriginalFilename(),
                    watermarkImage.getInputStream(),
                    watermarkImage.getSize(),
                    watermarkImage.getContentType());
        }
        if ("image".equals(type) && (uploadedImageFileId == null || uploadedImageFileId.isBlank())) {
            throw new BizException("图片水印缺少 watermarkImage 或 imageFileId");
        }
        final String finalImageFileId = uploadedImageFileId;

        return fileTaskTemplate.submit(file)
                .originalName(originalFileName)
                .asTask("pdf-add-watermark")
                .run(ctx -> fileConversionTask.processPdfAddWatermarkEnhanced(
                        ctx.taskId(), ctx.fileId(), finalImageFileId, ctx.fileName(),
                        type, layout, x, y, watermarkText, opacity, rotation, scale, fontSize, color));
    }

    /**
     * PDF 电子签字：把签名图片按归一化坐标（0-1）戳到指定页面的指定位置。
     * <p>
     * 签名图片支持两种传法（小程序 wx.uploadFile 单 file 限制下走 fileId）：
     * <ul>
     *   <li>signature：直接 multipart 上传图片</li>
     *   <li>signatureFileId：先用 /file/upload 拿到 fileId 再传字符串</li>
     * </ul>
     */
    @PostMapping("/pdf-sign")
    public Result<String> pdfSign(@RequestParam("file") MultipartFile file,
                                  @RequestParam(value = "signature", required = false) MultipartFile signature,
                                  @RequestParam(value = "signatureFileId", required = false) String signatureFileId,
                                  @RequestParam("signaturesJson") String signaturesJson,
                                  @RequestParam(value = "originalFileName", required = false) String originalFileName) throws IOException {
        if (signaturesJson == null || signaturesJson.isBlank()) {
            throw new BizException("缺少签名位置信息");
        }

        String resolvedSignatureId = signatureFileId;
        if (signature != null && !signature.isEmpty()) {
            String contentType = signature.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                throw new BizException("签名必须为图片文件");
            }
            resolvedSignatureId = fileStorageService.uploadFile(
                    signature.getOriginalFilename(),
                    signature.getInputStream(),
                    signature.getSize(),
                    contentType);
        }
        if (resolvedSignatureId == null || resolvedSignatureId.isBlank()) {
            throw new BizException("签名图片不能为空");
        }
        final String signatureId = resolvedSignatureId;

        return fileTaskTemplate.submit(file)
                .originalName(originalFileName)
                .requireExtension(".pdf")
                .asTask("pdf-sign")
                .run(ctx -> fileConversionTask.processPdfSign(
                        ctx.taskId(), ctx.fileId(), signatureId, ctx.fileName(), signaturesJson));
    }
}
