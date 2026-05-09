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
            dto.setExtraData((String) resultData.get("extraData"));
        }

        return dto;
    }
}
