package com.wechat.tools.controller;

import com.wechat.tools.common.FileUploadResult;
import com.wechat.tools.common.Result;
import com.wechat.tools.common.TaskStatusResult;
import com.wechat.tools.service.FileStorageService;
import com.wechat.tools.service.TaskService;
import jakarta.servlet.http.HttpServletResponse;
import org.apache.commons.io.IOUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/file")
public class FileController {

    private final FileStorageService fileStorageService;
    private final TaskService taskService;

    public FileController(FileStorageService fileStorageService, TaskService taskService) {
        this.fileStorageService = fileStorageService;
        this.taskService = taskService;
    }

    @PostMapping("/upload")
    public Result<FileUploadResult> upload(@RequestParam("file") MultipartFile file) {
        try {
            String fileId = fileStorageService.uploadFile(
                file.getOriginalFilename(),
                file.getInputStream(),
                file.getSize(),
                file.getContentType()
            );
            FileUploadResult result = new FileUploadResult(
                fileId,
                file.getOriginalFilename(),
                file.getSize(),
                file.getContentType()
            );
            return Result.success(result, "文件上传成功");
        } catch (Exception e) {
            return Result.error("文件上传失败：" + e.getMessage());
        }
    }

    @GetMapping("/download/{fileId}")
    public void download(@PathVariable String fileId, @RequestParam(required = false) String name, HttpServletResponse response) {
        try {
            response.setContentType("application/octet-stream");
            // 使用 RFC 5987 标准对文件名进行编码，确保中文和特殊字符在不同浏览器/客户端中正常显示
            String encodedName = name != null ? java.net.URLEncoder.encode(name, "UTF-8").replace("+", "%20") : fileId;
            response.setHeader("Content-Disposition", "attachment; filename=\"" + encodedName + "\"; filename*=UTF-8''" + encodedName);
            
            try (java.io.InputStream inputStream = fileStorageService.downloadFile(fileId);
                 java.io.OutputStream out = response.getOutputStream()) {
                IOUtils.copy(inputStream, out);
                out.flush();
            }
        } catch (Exception e) {
            throw new RuntimeException("文件下载失败", e);
        }
    }

    @GetMapping("/url/{fileId}")
    public Result<String> getFileUrl(@PathVariable String fileId) {
        String url = fileStorageService.getFileUrl(fileId);
        return Result.success(url);
    }

    @GetMapping("/status/{taskId}")
    public Result<TaskStatusResult> getTaskStatus(@PathVariable String taskId) {
        return Result.success(taskService.getTaskStatus(taskId));
    }
}