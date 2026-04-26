package com.wechat.tools.common;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TaskStatusResult {
    private String taskId;
    private String toolType;
    private String sourceFileName;
    private Long createdAt;
    private Long updatedAt;
    private String status;
    private Integer progress;
    private String message;
    private String resultUrl;
    private String resultFileName;
    private List<String> strategyTrace;
    private String selectedStrategy;
    private Map<String, Object> qualityGate;
    private String fallbackReason;
    private List<String> warnings;

    public static TaskStatusResult processing(String taskId, Integer progress) {
        return new TaskStatusResult(taskId, null, null, null, null, "PROCESSING", progress, "处理中...", null, null,
            null, null, null, null, null);
    }

    public static TaskStatusResult success(String taskId, String resultUrl, String resultFileName) {
        return new TaskStatusResult(taskId, null, null, null, null, "SUCCESS", 100, "处理完成", resultUrl, resultFileName,
            null, null, null, null, null);
    }

    public static TaskStatusResult fail(String taskId, String message) {
        return new TaskStatusResult(taskId, null, null, null, null, "FAIL", 0, message, null, null,
            null, null, null, null, null);
    }
}
