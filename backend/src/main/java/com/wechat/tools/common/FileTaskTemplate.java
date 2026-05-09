package com.wechat.tools.common;

import com.wechat.tools.service.FileStorageService;
import com.wechat.tools.service.TaskService;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Locale;

/**
 * 单文件异步任务统一模板：把"校验→落盘→建任务→提交异步"压成一行链式调用。
 * <p>
 * 典型用法：
 * <pre>
 * return fileTaskTemplate.submit(file)
 *         .originalName(originalFileName)
 *         .requireExtension(".pdf")
 *         .asTask("pdf-word")
 *         .run(ctx -&gt; fileConversionTask.processPdfToWord(ctx.taskId(), ctx.fileId(), ctx.fileName()));
 * </pre>
 * <p>
 * 校验失败抛 {@link BizException}，由 GlobalExceptionHandler 统一捕获返回 4xx；
 * IO 错误抛 BizException(500) 也走同一通道。
 */
@Component
public class FileTaskTemplate {

    private final FileStorageService fileStorageService;
    private final TaskService taskService;

    public FileTaskTemplate(FileStorageService fileStorageService, TaskService taskService) {
        this.fileStorageService = fileStorageService;
        this.taskService = taskService;
    }

    public Builder submit(MultipartFile file) {
        return new Builder(file);
    }

    /** 提交一个不需要上传文件的异步任务（仅建任务 + 异步派发）。 */
    public Result<String> submitNoFile(String taskType, String displayName, NoFileTaskRunner runner) {
        String taskId = taskService.createTask(taskType, displayName);
        runner.run(taskId);
        return Result.success(taskId, "任务已创建");
    }

    public class Builder {
        private final MultipartFile file;
        private String originalFileName;
        private String[] allowedExtensions;
        private String contentTypePrefix;
        private String taskType;

        private Builder(MultipartFile file) {
            this.file = file;
        }

        /** 前端传过来的真实文件名（小程序上传时往往会丢失，必须显式带上）。 */
        public Builder originalName(String name) {
            this.originalFileName = name;
            return this;
        }

        /** 限定允许的后缀名，全部小写匹配，如 ".pdf" / ".doc",".docx"。 */
        public Builder requireExtension(String... extensions) {
            this.allowedExtensions = extensions;
            return this;
        }

        /** 限定 contentType 前缀，例如 "image/"。 */
        public Builder requireContentTypePrefix(String prefix) {
            this.contentTypePrefix = prefix;
            return this;
        }

        public Builder asTask(String taskType) {
            this.taskType = taskType;
            return this;
        }

        public Result<String> run(TaskRunner runner) {
            if (taskType == null || taskType.isBlank()) {
                throw new IllegalStateException("FileTaskTemplate 缺少 asTask(...) 调用");
            }
            if (file == null || file.isEmpty()) {
                throw new BizException("文件不能为空");
            }

            String resolvedName = resolveFileName();
            validateExtension(resolvedName);
            validateContentType();

            String fileId;
            try {
                fileId = fileStorageService.uploadFile(
                        resolvedName,
                        file.getInputStream(),
                        file.getSize(),
                        file.getContentType()
                );
            } catch (IOException e) {
                throw new BizException(500, "文件读取失败", e);
            }

            String taskId = taskService.createTask(taskType, resolvedName);
            runner.run(new TaskContext(taskId, fileId, resolvedName));
            return Result.success(taskId, "任务已创建");
        }

        private String resolveFileName() {
            if (originalFileName != null && !originalFileName.isBlank()) {
                return originalFileName.trim();
            }
            return file.getOriginalFilename();
        }

        private void validateExtension(String fileName) {
            if (allowedExtensions == null || allowedExtensions.length == 0) {
                return;
            }
            String lower = fileName == null ? "" : fileName.toLowerCase(Locale.ROOT);
            for (String ext : allowedExtensions) {
                if (lower.endsWith(ext.toLowerCase(Locale.ROOT))) {
                    return;
                }
            }
            throw new BizException("文件类型不支持，仅允许：" + String.join("/", allowedExtensions));
        }

        private void validateContentType() {
            if (contentTypePrefix == null) {
                return;
            }
            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith(contentTypePrefix)) {
                throw new BizException("文件 MIME 类型不符合要求：需要 " + contentTypePrefix + "*");
            }
        }
    }

    /** 异步处理回调，拿到 taskId/fileId/fileName 后投递到 FileConversionTask。 */
    @FunctionalInterface
    public interface TaskRunner {
        void run(TaskContext ctx);
    }

    /** 不需要上传文件的回调（如二维码生成）。 */
    @FunctionalInterface
    public interface NoFileTaskRunner {
        void run(String taskId);
    }

    public record TaskContext(String taskId, String fileId, String fileName) {}
}
