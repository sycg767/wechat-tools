package com.wechat.tools.service;

import com.wechat.tools.common.TaskStatusResult;

public interface TaskService {

    String createTask(String toolType, String sourceFileName);

    TaskStatusResult getTaskStatus(String taskId);

    void updateTaskStatus(String taskId, TaskStatusResult status);
}
