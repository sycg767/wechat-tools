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
 * 单文件转换类工具：rename / pdf↔word / pdf↔excel / csv↔excel / 图片压缩 / 证件照换底色。
 * 全部走 {@link FileTaskTemplate} 标准模板，校验失败统一抛 BizException。
 */
@RestController
@RequestMapping("/tool")
public class ConverterController {

    private final FileTaskTemplate fileTaskTemplate;
    private final FileConversionTask fileConversionTask;

    public ConverterController(FileTaskTemplate fileTaskTemplate, FileConversionTask fileConversionTask) {
        this.fileTaskTemplate = fileTaskTemplate;
        this.fileConversionTask = fileConversionTask;
    }

    @PostMapping("/rename")
    public Result<String> rename(@RequestParam("file") MultipartFile file,
                                 @RequestParam("newName") String newName,
                                 @RequestParam(value = "originalFileName", required = false) String originalFileName) {
        if (newName == null || newName.isBlank()) {
            throw new BizException("新文件名不能为空");
        }
        return fileTaskTemplate.submit(file)
                .originalName(originalFileName)
                .asTask("rename")
                .run(ctx -> {
                    String finalName = appendExtensionIfMissing(newName.trim(), ctx.fileName());
                    fileConversionTask.processRename(ctx.taskId(), ctx.fileId(), finalName);
                });
    }

    @PostMapping("/pdf-to-word")
    public Result<String> pdfToWord(@RequestParam("file") MultipartFile file,
                                    @RequestParam(value = "originalFileName", required = false) String originalFileName) {
        return fileTaskTemplate.submit(file)
                .originalName(originalFileName)
                .requireExtension(".pdf")
                .asTask("pdf-word")
                .run(ctx -> fileConversionTask.processPdfToWord(ctx.taskId(), ctx.fileId(), ctx.fileName()));
    }

    @PostMapping("/word-to-pdf")
    public Result<String> wordToPdf(@RequestParam("file") MultipartFile file,
                                    @RequestParam(value = "originalFileName", required = false) String originalFileName) {
        return fileTaskTemplate.submit(file)
                .originalName(originalFileName)
                .requireExtension(".doc", ".docx")
                .asTask("word-pdf")
                .run(ctx -> fileConversionTask.processWordToPdf(ctx.taskId(), ctx.fileId(), ctx.fileName()));
    }

    @PostMapping("/pdf-to-excel")
    public Result<String> pdfToExcel(@RequestParam("file") MultipartFile file,
                                     @RequestParam(value = "originalFileName", required = false) String originalFileName) {
        return fileTaskTemplate.submit(file)
                .originalName(originalFileName)
                .requireExtension(".pdf")
                .asTask("pdf-excel")
                .run(ctx -> fileConversionTask.processPdfToExcel(ctx.taskId(), ctx.fileId(), ctx.fileName()));
    }

    @PostMapping("/csv-to-excel")
    public Result<String> csvToExcel(@RequestParam("file") MultipartFile file,
                                     @RequestParam(value = "originalFileName", required = false) String originalFileName) {
        return fileTaskTemplate.submit(file)
                .originalName(originalFileName)
                .requireExtension(".csv")
                .asTask("csv-excel")
                .run(ctx -> fileConversionTask.processCsvToExcel(ctx.taskId(), ctx.fileId(), ctx.fileName()));
    }

    @PostMapping("/excel-to-csv")
    public Result<String> excelToCsv(@RequestParam("file") MultipartFile file,
                                     @RequestParam(value = "originalFileName", required = false) String originalFileName) {
        return fileTaskTemplate.submit(file)
                .originalName(originalFileName)
                .requireExtension(".xls", ".xlsx")
                .asTask("excel-csv")
                .run(ctx -> fileConversionTask.processExcelToCsv(ctx.taskId(), ctx.fileId(), ctx.fileName()));
    }

    @PostMapping("/compress-image")
    public Result<String> compressImage(@RequestParam("file") MultipartFile file,
                                        @RequestParam(value = "quality", defaultValue = "0.8") double quality,
                                        @RequestParam(value = "originalFileName", required = false) String originalFileName) {
        return fileTaskTemplate.submit(file)
                .originalName(originalFileName)
                .asTask("compress-image")
                .run(ctx -> fileConversionTask.processCompressImage(ctx.taskId(), ctx.fileId(), ctx.fileName(), quality));
    }

    @PostMapping("/change-id-photo-bg")
    public Result<String> changeIdPhotoBackground(@RequestParam("file") MultipartFile file,
                                                  @RequestParam("bgColor") String bgColor,
                                                  @RequestParam(value = "originalFileName", required = false) String originalFileName) {
        String normalizedBgColor = bgColor == null ? "" : bgColor.trim().toLowerCase();
        if (!List.of("red", "blue", "white").contains(normalizedBgColor)) {
            throw new BizException("背景颜色仅支持 red、blue、white");
        }
        return fileTaskTemplate.submit(file)
                .originalName(originalFileName)
                .requireContentTypePrefix("image/")
                .asTask("id-photo-bg")
                .run(ctx -> fileConversionTask.processChangeIdPhotoBg(
                        ctx.taskId(), ctx.fileId(), ctx.fileName(), normalizedBgColor));
    }

    private static String appendExtensionIfMissing(String newName, String originalName) {
        if (originalName == null || !originalName.contains(".")) {
            return newName;
        }
        String ext = originalName.substring(originalName.lastIndexOf("."));
        if (newName.toLowerCase().endsWith(ext.toLowerCase())) {
            return newName;
        }
        return newName + ext;
    }
}
