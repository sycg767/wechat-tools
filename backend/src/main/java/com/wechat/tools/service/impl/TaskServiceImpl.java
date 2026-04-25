package com.wechat.tools.service.impl;

import com.wechat.tools.common.TaskStatusResult;
import com.wechat.tools.service.TaskService;
import org.springframework.stereotype.Service;

import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class TaskServiceImpl implements TaskService {

    private final ConcurrentHashMap<String, TaskStatusResult> taskCache = new ConcurrentHashMap<>();

    @Override
    public String createTask(String toolType, String sourceFileName) {
        String taskId = UUID.randomUUID().toString().replace("-", "");
        long now = System.currentTimeMillis();
        TaskStatusResult taskStatus = TaskStatusResult.processing(taskId, 0);
        taskStatus.setToolType(toolType);
        taskStatus.setSourceFileName(sourceFileName);
        taskStatus.setCreatedAt(now);
        taskStatus.setUpdatedAt(now);
        taskCache.put(taskId, taskStatus);
        return taskId;
    }

    @Override
    public TaskStatusResult getTaskStatus(String taskId) {
        return taskCache.getOrDefault(taskId, TaskStatusResult.fail(taskId, "任务不存在"));
    }

    @Override
    public void updateTaskStatus(String taskId, TaskStatusResult status) {
        TaskStatusResult existing = taskCache.get(taskId);
        if (existing != null) {
            status.setToolType(existing.getToolType());
            status.setSourceFileName(existing.getSourceFileName());
            status.setCreatedAt(existing.getCreatedAt());
        }
        status.setUpdatedAt(System.currentTimeMillis());
        taskCache.put(taskId, status);
    }
}
