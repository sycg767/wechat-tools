package com.wechat.tools.service.impl;

import com.wechat.tools.common.TaskMetrics;
import com.wechat.tools.common.TaskStatusResult;
import com.wechat.tools.entity.TaskEntity;
import com.wechat.tools.repository.TaskRepository;
import com.wechat.tools.service.TaskService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class TaskServiceImpl implements TaskService {

    private final TaskRepository taskRepository;
    private final TaskMetrics taskMetrics;

    public TaskServiceImpl(TaskRepository taskRepository, TaskMetrics taskMetrics) {
        this.taskRepository = taskRepository;
        this.taskMetrics = taskMetrics;
    }

    @Override
    @Transactional
    public String createTask(String toolType, String sourceFileName) {
        String taskId = UUID.randomUUID().toString().replace("-", "");

        TaskEntity entity = new TaskEntity();
        entity.setId(taskId);
        entity.setToolType(toolType);
        entity.setSourceFileName(sourceFileName);
        entity.setStatus("PROCESSING");
        entity.setProgress(0);
        entity.setMessage("处理中...");

        taskRepository.save(entity);
        taskMetrics.onTaskCreated(taskId, toolType);
        return taskId;
    }

    @Override
    public TaskStatusResult getTaskStatus(String taskId) {
        return taskRepository.findById(taskId)
                .map(this::convertToDto)
                .orElse(TaskStatusResult.fail(taskId, "任务不存在"));
    }

    @Override
    @Transactional
    public void updateTaskStatus(String taskId, TaskStatusResult status) {
        taskRepository.findById(taskId).ifPresent(entity -> {
            entity.setStatus(status.getStatus());
            entity.setProgress(status.getProgress());
            entity.setMessage(status.getMessage());

            Map<String, Object> resultData = new HashMap<>();
            if (status.getResultUrl() != null) resultData.put("resultUrl", status.getResultUrl());
            if (status.getResultFileName() != null) resultData.put("resultFileName", status.getResultFileName());
            if (status.getStrategyTrace() != null) resultData.put("strategyTrace", status.getStrategyTrace());
            if (status.getSelectedStrategy() != null) resultData.put("selectedStrategy", status.getSelectedStrategy());
            if (status.getQualityGate() != null) resultData.put("qualityGate", status.getQualityGate());
            if (status.getFallbackReason() != null) resultData.put("fallbackReason", status.getFallbackReason());
            if (status.getWarnings() != null) resultData.put("warnings", status.getWarnings());
            if (status.getExtraData() != null) resultData.put("extraData", status.getExtraData());

            entity.setResultData(resultData);
            taskRepository.save(entity);
        });
        taskMetrics.onTaskFinished(taskId, status.getStatus());
    }

    private TaskStatusResult convertToDto(TaskEntity entity) {
        TaskStatusResult dto = new TaskStatusResult();
        dto.setTaskId(entity.getId());
        dto.setToolType(entity.getToolType());
        dto.setSourceFileName(entity.getSourceFileName());
        dto.setStatus(entity.getStatus());
        dto.setProgress(entity.getProgress());
        dto.setMessage(entity.getMessage());

        if (entity.getCreatedAt() != null) {
            dto.setCreatedAt(entity.getCreatedAt().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli());
        }
        if (entity.getUpdatedAt() != null) {
            dto.setUpdatedAt(entity.getUpdatedAt().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli());
        }

        Map<String, Object> resultData = entity.getResultData();
        if (resultData != null) {
            dto.setResultUrl((String) resultData.get("resultUrl"));
            dto.setResultFileName((String) resultData.get("resultFileName"));
            dto.setStrategyTrace(asStringList(resultData.get("strategyTrace")));
            dto.setSelectedStrategy((String) resultData.get("selectedStrategy"));
            dto.setQualityGate(asObjectMap(resultData.get("qualityGate")));
            dto.setFallbackReason((String) resultData.get("fallbackReason"));
            dto.setWarnings(asStringList(resultData.get("warnings")));
            dto.setExtraData((String) resultData.get("extraData"));
        }

        return dto;
    }

    @SuppressWarnings("unchecked")
    private List<String> asStringList(Object value) {
        return value instanceof List<?> ? (List<String>) value : null;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> asObjectMap(Object value) {
        return value instanceof Map<?, ?> ? (Map<String, Object>) value : null;
    }
}
