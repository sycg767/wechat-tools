package com.wechat.tools.controller;

import com.wechat.tools.common.Result;
import com.wechat.tools.service.TaskService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/task")
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @PostMapping("/create")
    public Result<String> createTask() {
        String taskId = taskService.createTask("manual", "未命名任务");
        return Result.success(taskId, "任务创建成功");
    }
}
