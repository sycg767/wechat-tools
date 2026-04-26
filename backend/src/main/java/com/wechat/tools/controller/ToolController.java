package com.wechat.tools.controller;

import com.wechat.tools.common.Result;
import com.wechat.tools.service.TaskService;
import com.wechat.tools.task.FileConversionTask;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/tool")
public class ToolController {

    private final TaskService taskService;
    private final FileConversionTask fileConversionTask;
    private final com.wechat.tools.service.FileStorageService fileStorageService;

    public ToolController(TaskService taskService, FileConversionTask fileConversionTask, com.wechat.tools.service.FileStorageService fileStorageService) {
        this.taskService = taskService;
        this.fileConversionTask = fileConversionTask;
        this.fileStorageService = fileStorageService;
    }

    @PostMapping("/rename")
    public Result<String> rename(@RequestParam("file") MultipartFile file,
                                 @RequestParam("newName") String newName,
                                 @RequestParam(value = "originalFileName", required = false) String originalFileName) {
        try {
            if (file.isEmpty()) {
                return Result.error(400, "文件不能为空");
            }
            if (newName == null || newName.isBlank()) {
                return Result.error(400, "新文件名不能为空");
            }

            String resolvedFileName = originalFileName != null && !originalFileName.isBlank()
                ? originalFileName.trim()
                : file.getOriginalFilename();

            // 先保存文件到临时目录，避免直接持有 byte[] 导致 OOM
            String sourceFileId = fileStorageService.uploadFile(
                resolvedFileName,
                file.getInputStream(),
                file.getSize(),
                file.getContentType()
            );

            String finalNewName = newName.trim();

            // 自动补全后缀名逻辑
            if (resolvedFileName != null && resolvedFileName.contains(".")) {
                String extension = resolvedFileName.substring(resolvedFileName.lastIndexOf("."));
                if (!finalNewName.toLowerCase().endsWith(extension.toLowerCase())) {
                    finalNewName += extension;
                }
            }

            String sourceFileName = resolvedFileName != null ? resolvedFileName : finalNewName;
            String taskId = taskService.createTask("rename", sourceFileName);

            // 异步处理，传递文件 ID 而非字节数组
            fileConversionTask.processRename(taskId, sourceFileId, finalNewName);

            return Result.success(taskId, "任务已创建");
        } catch (Exception e) {
            return Result.error("重命名失败：" + e.getMessage());
        }
    }

    @PostMapping("/pdf-to-word")
    public Result<String> pdfToWord(@RequestParam("file") MultipartFile file,
                                    @RequestParam(value = "originalFileName", required = false) String originalFileName) {
        try {
            if (file.isEmpty()) {
                return Result.error(400, "文件不能为空");
            }
            String resolvedFileName = originalFileName != null && !originalFileName.isBlank()
                ? originalFileName.trim()
                : file.getOriginalFilename();
            if (resolvedFileName == null || !resolvedFileName.toLowerCase().endsWith(".pdf")) {
                return Result.error(400, "请上传 PDF 文件");
            }

            // 先保存文件
            String sourceFileId = fileStorageService.uploadFile(
                resolvedFileName,
                file.getInputStream(),
                file.getSize(),
                file.getContentType()
            );

            String taskId = taskService.createTask("pdf-word", resolvedFileName);

            // 异步处理
            fileConversionTask.processPdfToWord(taskId, sourceFileId, resolvedFileName);

            return Result.success(taskId, "任务已创建");
        } catch (Exception e) {
            return Result.error("PDF 转 Word 失败：" + e.getMessage());
        }
    }

    @PostMapping("/compress-image")
    public Result<String> compressImage(@RequestParam("file") MultipartFile file,
                                        @RequestParam(value = "quality", defaultValue = "0.8") double quality,
                                        @RequestParam(value = "originalFileName", required = false) String originalFileName) {
        try {
            if (file.isEmpty()) {
                return Result.error(400, "文件不能为空");
            }
            String resolvedFileName = originalFileName != null && !originalFileName.isBlank()
                ? originalFileName.trim()
                : file.getOriginalFilename();

            // 先保存文件
            String sourceFileId = fileStorageService.uploadFile(
                resolvedFileName,
                file.getInputStream(),
                file.getSize(),
                file.getContentType()
            );

            String taskId = taskService.createTask("compress-image", resolvedFileName);

            // 异步处理
            fileConversionTask.processCompressImage(taskId, sourceFileId, resolvedFileName, quality);

            return Result.success(taskId, "任务已创建");
        } catch (Exception e) {
            return Result.error("图片压缩失败：" + e.getMessage());
        }
    }

    @PostMapping("/change-id-photo-bg")
    public Result<String> changeIdPhotoBackground(@RequestParam("file") MultipartFile file,
                                                  @RequestParam("bgColor") String bgColor,
                                                  @RequestParam(value = "originalFileName", required = false) String originalFileName) {
        try {
            if (file.isEmpty()) {
                return Result.error(400, "文件不能为空");
            }

            String normalizedBgColor = bgColor == null ? "" : bgColor.trim().toLowerCase();
            if (!List.of("red", "blue", "white").contains(normalizedBgColor)) {
                return Result.error(400, "背景颜色仅支持 red、blue、white");
            }

            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                return Result.error(400, "请上传图片文件");
            }

            String resolvedFileName = originalFileName != null && !originalFileName.isBlank()
                ? originalFileName.trim()
                : file.getOriginalFilename();

            String sourceFileId = fileStorageService.uploadFile(
                resolvedFileName,
                file.getInputStream(),
                file.getSize(),
                contentType
            );

            String taskId = taskService.createTask("id-photo-bg", resolvedFileName);
            fileConversionTask.processChangeIdPhotoBg(taskId, sourceFileId, resolvedFileName, normalizedBgColor);

            return Result.success(taskId, "任务已创建");
        } catch (Exception e) {
            return Result.error("证件照换底色失败：" + e.getMessage());
        }
    }

    @PostMapping("/pdf-to-excel")
    public Result<String> pdfToExcel(@RequestParam("file") MultipartFile file,
                                     @RequestParam(value = "originalFileName", required = false) String originalFileName) {
        try {
            if (file.isEmpty()) {
                return Result.error(400, "文件不能为空");
            }
            String resolvedFileName = originalFileName != null && !originalFileName.isBlank()
                ? originalFileName.trim()
                : file.getOriginalFilename();
            if (resolvedFileName == null || !resolvedFileName.toLowerCase().endsWith(".pdf")) {
                return Result.error(400, "请上传 PDF 文件");
            }

            // 先保存文件
            String sourceFileId = fileStorageService.uploadFile(
                resolvedFileName,
                file.getInputStream(),
                file.getSize(),
                file.getContentType()
            );

            String taskId = taskService.createTask("pdf-excel", resolvedFileName);

            // 异步处理
            fileConversionTask.processPdfToExcel(taskId, sourceFileId, resolvedFileName);

            return Result.success(taskId, "任务已创建");
        } catch (Exception e) {
            return Result.error("PDF 转 Excel 失败：" + e.getMessage());
        }
    }

    @PostMapping("/pdf-merge")
    public Result<String> pdfMerge(@RequestParam("files") MultipartFile[] files) {
        try {
            if (files == null || files.length < 2) {
                return Result.error(400, "请至少上传两个 PDF 文件进行合并");
            }

            List<String> sourceFileIds = new ArrayList<>();
            for (MultipartFile file : files) {
                if (file.isEmpty()) continue;
                String fileId = fileStorageService.uploadFile(
                    file.getOriginalFilename(),
                    file.getInputStream(),
                    file.getSize(),
                    file.getContentType()
                );
                sourceFileIds.add(fileId);
            }

            if (sourceFileIds.size() < 2) {
                return Result.error(400, "有效文件不足，无法合并");
            }

            String taskId = taskService.createTask("pdf-merge", "多个PDF合并");
            fileConversionTask.processPdfMerge(taskId, sourceFileIds, "merged.pdf");

            return Result.success(taskId, "任务已创建");
        } catch (Exception e) {
            return Result.error("PDF 合并失败：" + e.getMessage());
        }
    }

    @PostMapping("/pdf-merge-by-ids")
    public Result<String> pdfMergeByIds(@RequestBody Map<String, Object> payload) {
        @SuppressWarnings("unchecked")
        List<String> fileIds = (List<String>) payload.get("fileIds");
        String customFileName = (String) payload.get("fileName");
        
        try {
            if (fileIds == null || fileIds.size() < 2) {
                return Result.error(400, "请至少提供两个文件ID进行合并");
            }

            String resultFileName = customFileName != null && !customFileName.isBlank()
                ? customFileName.trim()
                : "merged.pdf";
            
            if (!resultFileName.toLowerCase().endsWith(".pdf")) {
                resultFileName += ".pdf";
            }

            String taskId = taskService.createTask("pdf-merge", "多个PDF合并");
            fileConversionTask.processPdfMerge(taskId, fileIds, resultFileName);

            return Result.success(taskId, "任务已创建");
        } catch (Exception e) {
            return Result.error("PDF 合并失败：" + e.getMessage());
        }
    }

    @PostMapping("/pdf-split")
    public Result<String> pdfSplit(@RequestParam("file") MultipartFile file,
                                   @RequestParam(value = "range", required = false) String range,
                                   @RequestParam(value = "originalFileName", required = false) String originalFileName) {
        try {
            if (file.isEmpty()) {
                return Result.error(400, "文件不能为空");
            }
            String resolvedFileName = originalFileName != null && !originalFileName.isBlank()
                ? originalFileName.trim()
                : file.getOriginalFilename();
            
            String sourceFileId = fileStorageService.uploadFile(
                resolvedFileName,
                file.getInputStream(),
                file.getSize(),
                file.getContentType()
            );

            String taskId = taskService.createTask("pdf-split", resolvedFileName);
            fileConversionTask.processPdfSplit(taskId, sourceFileId, resolvedFileName, range);

            return Result.success(taskId, "任务已创建");
        } catch (Exception e) {
            return Result.error("PDF 拆分失败：" + e.getMessage());
        }
    }

    @PostMapping("/pdf-preview")
    public Result<Map<String, Object>> pdfPreview(@RequestParam("file") MultipartFile file) {
        try {
            if (file.isEmpty()) return Result.error(400, "文件不能为空");
            
            try (PDDocument document = Loader.loadPDF(file.getBytes())) {
                if (document.getNumberOfPages() == 0) return Result.error(400, "PDF 无内容");
                
                PDFRenderer renderer = new PDFRenderer(document);
                BufferedImage image = renderer.renderImageWithDPI(0, 72); // 低 DPI 用于预览
                
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                ImageIO.write(image, "png", baos);
                byte[] bytes = baos.toByteArray();
                
                String base64 = java.util.Base64.getEncoder().encodeToString(bytes);
                
                return Result.success(Map.of(
                    "preview", "data:image/png;base64," + base64,
                    "width", image.getWidth(),
                    "height", image.getHeight()
                ));
            }
        } catch (Exception e) {
            return Result.error("预览生成失败：" + e.getMessage());
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
                                          @RequestParam(value = "originalFileName", required = false) String originalFileName) {
        try {
            if (file.isEmpty()) return Result.error(400, "文件不能为空");
            
            String resolvedFileName = originalFileName != null && !originalFileName.isBlank()
                ? originalFileName.trim()
                : file.getOriginalFilename();

            String sourceFileId = fileStorageService.uploadFile(
                resolvedFileName,
                file.getInputStream(),
                file.getSize(),
                file.getContentType()
            );

            String uploadedImageFileId = imageFileId;
            if ("image".equals(type) && watermarkImage != null && !watermarkImage.isEmpty()) {
                uploadedImageFileId = fileStorageService.uploadFile(
                    watermarkImage.getOriginalFilename(),
                    watermarkImage.getInputStream(),
                    watermarkImage.getSize(),
                    watermarkImage.getContentType()
                );
            }
            if ("image".equals(type) && (uploadedImageFileId == null || uploadedImageFileId.isBlank())) {
                return Result.error(400, "图片水印缺少 watermarkImage 或 imageFileId");
            }

            String taskId = taskService.createTask("pdf-add-watermark", resolvedFileName);
            fileConversionTask.processPdfAddWatermarkEnhanced(taskId, sourceFileId, uploadedImageFileId, resolvedFileName,
                type, layout, x, y, watermarkText, opacity, rotation, scale, fontSize, color);

            return Result.success(taskId, "任务已创建");
        } catch (Exception e) {
            return Result.error("PDF 加水印失败：" + e.getMessage());
        }
    }


}
