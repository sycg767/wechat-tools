package com.wechat.tools.controller;

import com.wechat.tools.common.Result;
import com.wechat.tools.service.TaskService;
import com.wechat.tools.task.FileConversionTask;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

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

}
